package com.gala.otw_server.couple.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.couple.dto.SpotDto;
import com.gala.otw_server.couple.dto.SpotsDto;
import com.gala.otw_server.couple.entity.SpotCategory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Finds cafes, restaurants, parks and malls around a point from OpenStreetMap (Overpass API: free, no key).
 * The browser never calls it: answers are cached per ~100 m cell for hours, so we stay polite to the public
 * server, and an outage just means "no suggestions right now" (never a 500). Data (c) OpenStreetMap contributors.
 */
@Service
public class OverpassSpotFinder {

    private static final Logger log = LoggerFactory.getLogger(OverpassSpotFinder.class);

    static final int RADIUS_M = 3000;
    static final int MAX_SPOTS = 15;
    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final CacheService cache;
    private final ObjectMapper mapper;
    private final String url;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public OverpassSpotFinder(CacheService cache,
                              ObjectMapper mapper,
                              @Value("${otw.overpass.url:https://overpass-api.de/api/interpreter}") String url) {
        this.cache = cache;
        this.mapper = mapper;
        this.url = url;
    }

    public SpotsDto find(SpotCategory category, double lat, double lng) {
        String key = String.format(Locale.ROOT, "couple:spots:%s:%.3f:%.3f", category, lat, lng);
        var hit = cache.get(key);
        if (hit.isPresent()) {
            try {
                return new SpotsDto(true, mapper.readValue(hit.get(), new TypeReference<List<SpotDto>>() {}));
            } catch (Exception ex) {
                cache.evict(key); // unreadable cache entry: fall through to a fresh lookup
            }
        }
        try {
            List<SpotDto> spots = query(category, lat, lng);
            cache.set(key, mapper.writeValueAsString(spots), CACHE_TTL);
            return new SpotsDto(true, spots);
        } catch (Exception ex) {
            log.warn("Overpass lookup failed ({}): {}", category, ex.getMessage());
            return new SpotsDto(false, List.of());
        }
    }

    private List<SpotDto> query(SpotCategory category, double lat, double lng) throws Exception {
        String ql = String.format(Locale.ROOT,
                "[out:json][timeout:15];nwr[\"%s\"=\"%s\"][\"name\"](around:%d,%.6f,%.6f);out center 80;",
                category.tagKey(), category.tagValue(), RADIUS_M, lat, lng);
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "OTW-GalaPlanner/1.0 (halfway checker)")
                .POST(HttpRequest.BodyPublishers.ofString("data=" + URLEncoder.encode(ql, StandardCharsets.UTF_8)))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            throw new IllegalStateException("Overpass answered " + res.statusCode());
        }
        return parse(res.body(), category, lat, lng);
    }

    /** Package-visible for tests: turns an Overpass answer into the nearest named spots. */
    List<SpotDto> parse(String json, SpotCategory category, double lat, double lng) throws Exception {
        JsonNode elements = mapper.readTree(json).path("elements");
        List<SpotDto> out = new ArrayList<>();
        for (JsonNode e : elements) {
            String name = e.path("tags").path("name").asText("").trim();
            if (name.isEmpty()) continue;
            JsonNode at = e.has("center") ? e.get("center") : e;
            if (!at.has("lat") || !at.has("lon")) continue;
            double sLat = at.get("lat").asDouble();
            double sLng = at.get("lon").asDouble();
            double km = GeoMath.round2(GeoMath.distanceKm(lat, lng, sLat, sLng));
            out.add(new SpotDto(name.length() > 80 ? name.substring(0, 80) : name,
                    category.name(), sLat, sLng, km, category.priceTier()));
        }
        out.sort(Comparator.comparingDouble(SpotDto::distanceKm));
        return out.size() > MAX_SPOTS ? new ArrayList<>(out.subList(0, MAX_SPOTS)) : out;
    }
}
