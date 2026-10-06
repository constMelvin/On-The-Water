package com.gala.otw_server.ratelimit;

import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter for protecting high-frequency endpoints and mitigating brute-force/DoS attacks.
 * Uses Redis with graceful fallback to in-memory tracking if Redis is unreachable.
 */
@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final StringRedisTemplate redis;
    private final ConcurrentHashMap<String, Long> localIntervalCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> localCounters = new ConcurrentHashMap<>();

    public RateLimiterService(@Autowired(required = false) StringRedisTemplate redis) {
        this.redis = redis;
    }

    /**
     * Enforces interval-based rate limiting (e.g. minimum 3s between live location updates).
     *
     * @param key Identifier for the rate-limited action (e.g., "ratelimit:location:userId")
     * @param minInterval Minimum allowed duration between requests
     * @throws TooManyRequestsException if the rate limit is exceeded
     */
    public void checkRateLimit(String key, Duration minInterval) {
        boolean allowed = tryAcquireInterval(key, minInterval);
        if (!allowed) {
            throw new TooManyRequestsException("Rate limit exceeded. Please wait " + minInterval.toSeconds() + "s between updates.");
        }
    }

    /**
     * Enforces count-per-window rate limiting (e.g. max 10 requests per 1 minute).
     *
     * @param key Identifier for the rate-limited action (e.g., "ratelimit:join:ip")
     * @param maxRequests Maximum number of allowed requests within the window
     * @param window Time window duration
     * @throws TooManyRequestsException if the rate limit is exceeded
     */
    public void checkRateLimit(String key, int maxRequests, Duration window) {
        boolean allowed = tryAcquireCount(key, maxRequests, window);
        if (!allowed) {
            throw new TooManyRequestsException("Rate limit exceeded. Maximum " + maxRequests + " requests per " + window.toSeconds() + "s.");
        }
    }

    /**
     * Attempts to acquire an interval-based rate limit permit.
     */
    public boolean tryAcquireInterval(String key, Duration minInterval) {
        if (redis != null) {
            try {
                Boolean setSuccess = redis.opsForValue().setIfAbsent(key, "1", minInterval);
                if (setSuccess != null) {
                    return setSuccess;
                }
            } catch (Exception ex) {
                log.warn("Redis rate limit check failed for '{}': {} — falling back to local memory", key, ex.getMessage());
            }
        }

        // Fallback: in-memory sliding window
        long now = System.currentTimeMillis();
        long windowMillis = minInterval.toMillis();

        Long previous = localIntervalCache.put(key, now);
        if (previous != null && (now - previous) < windowMillis) {
            localIntervalCache.put(key, previous); // restore previous timestamp
            return false;
        }

        // Maintenance cleanup if map grows too large
        if (localIntervalCache.size() > 5000) {
            localIntervalCache.entrySet().removeIf(entry -> (now - entry.getValue()) > windowMillis * 2);
        }

        return true;
    }

    /**
     * Attempts to acquire a count-based rate limit permit within a fixed window.
     */
    public boolean tryAcquireCount(String key, int maxRequests, Duration window) {
        if (redis != null) {
            try {
                Long current = redis.opsForValue().increment(key);
                if (current != null) {
                    // Set the window on the first hit, and repair a counter that lost its TTL
                    // (e.g. the expire call failed once): without one it never resets and the
                    // client stays locked out for good.
                    Long ttl = current == 1 ? null : redis.getExpire(key);
                    if (current == 1 || (ttl != null && ttl < 0)) {
                        redis.expire(key, window);
                    }
                    return current <= maxRequests;
                }
            } catch (Exception ex) {
                log.warn("Redis count rate limit check failed for '{}': {} — falling back to local memory", key, ex.getMessage());
            }
        }

        // Fallback: in-memory fixed window counter
        long now = System.currentTimeMillis();
        WindowCounter counter = localCounters.compute(key, (k, existing) -> {
            if (existing == null || now > existing.expiresAt) {
                return new WindowCounter(1, now + window.toMillis());
            }
            existing.count.incrementAndGet();
            return existing;
        });

        // Maintenance cleanup if map grows too large
        if (localCounters.size() > 5000) {
            localCounters.entrySet().removeIf(entry -> now > entry.getValue().expiresAt);
        }

        return counter.count.get() <= maxRequests;
    }

    /**
     * True when {@code key} has already used up {@code maxRequests} in its current window
     * (as counted by {@link #tryAcquireCount}). Only reads; never counts a request.
     */
    public boolean isOverCount(String key, int maxRequests) {
        if (redis != null) {
            try {
                String v = redis.opsForValue().get(key);
                return v != null && Long.parseLong(v) >= maxRequests;
            } catch (Exception ex) {
                log.warn("Redis count read failed for '{}': {} — falling back to local memory", key, ex.getMessage());
            }
        }
        WindowCounter counter = localCounters.get(key);
        return counter != null && System.currentTimeMillis() <= counter.expiresAt
                && counter.count.get() >= maxRequests;
    }

    private static class WindowCounter {
        final AtomicInteger count;
        final long expiresAt;

        WindowCounter(int initialCount, long expiresAt) {
            this.count = new AtomicInteger(initialCount);
            this.expiresAt = expiresAt;
        }
    }
}
