package com.gala.otw_server.realtime;

import com.gala.otw_server.config.SupabaseProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RealtimeEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEventPublisher.class);

    private final RestClient restClient;
    private final SupabaseProperties properties;

    public RealtimeEventPublisher(SupabaseProperties properties) {
        this.properties = properties;

        String baseUrl = (properties.getUrl() != null && !properties.getUrl().isBlank())
                ? properties.getUrl()
                : "https://placeholder.supabase.co";

        String serviceKey = (properties.getServiceRoleKey() != null)
                ? properties.getServiceRoleKey()
                : "";

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("apikey", serviceKey)
                .defaultHeader("Authorization", "Bearer " + serviceKey)
                .build();
    }

    /**
     * Publishes a realtime broadcast event to a room-scoped channel (room:{roomId}).
     *
     * @param roomId Target room UUID
     * @param event Event name (e.g., "itinerary.updated", "member.joined")
     * @param payload Event payload data
     */
    public void publish(UUID roomId, String event, Object payload) {
        if (properties.getUrl() == null || properties.getUrl().contains("placeholder") || properties.getServiceRoleKey() == null) {
            log.debug("Skipping Supabase Realtime broadcast because Supabase credentials are not configured.");
            return;
        }

        String topic = "room:" + roomId;

        // private = only subscribers who pass the realtime.messages RLS policy (active room
        // members, V16) receive it; the channel is never readable by anyone holding the anon key.
        Map<String, Object> message = Map.of(
                "topic", topic,
                "event", event,
                "payload", payload,
                "private", true
        );

        try {
            restClient.post()
                    .uri("/realtime/v1/api/broadcast")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("messages", List.of(message)))
                    .retrieve()
                    .toBodilessEntity();

            log.debug("Realtime event broadcasted successfully: topic={}, event={}", topic, event);
        } catch (Exception e) {
            // Log warning to prevent database transactions from rolling back due to transient realtime broadcast failures
            log.warn("Failed to broadcast Supabase Realtime event '{}' to topic '{}': {}", event, topic, e.getMessage());
        }
    }
}
