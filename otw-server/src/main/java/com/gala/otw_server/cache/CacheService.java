package com.gala.otw_server.cache;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * Disposable cache-aside service backed by Redis.
 * <p>
 * Guiding Rule 1 & §6:
 * Postgres is the source of truth. Redis failures degrade gracefully (log warning, fall through
 * to Postgres). Never throw 500 or crash an API call due to a Redis outage.
 */
@Service
public class CacheService {

    private static final Logger log = LoggerFactory.getLogger(CacheService.class);

    private final StringRedisTemplate redis;

    public CacheService(@Autowired(required = false) StringRedisTemplate redis) {
        this.redis = redis;
    }

    public Optional<String> get(String key) {
        if (redis == null) return Optional.empty();
        try {
            return Optional.ofNullable(redis.opsForValue().get(key));
        } catch (Exception ex) {
            log.warn("Redis read failure for key '{}': {} — falling back to database", key, ex.getMessage());
            return Optional.empty();
        }
    }

    public void set(String key, String value, Duration ttl) {
        if (redis == null) return;
        try {
            redis.opsForValue().set(key, value, ttl);
        } catch (Exception ex) {
            log.warn("Redis write failure for key '{}': {}", key, ex.getMessage());
        }
    }

    public void evict(String key) {
        if (redis == null) return;
        try {
            redis.delete(key);
        } catch (Exception ex) {
            log.warn("Redis eviction failure for key '{}': {}", key, ex.getMessage());
        }
    }

    public void evictAfterCommit(String key) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evict(key);
                }
            });
        } else {
            evict(key);
        }
    }

    // ── Hash Operations (e.g. for ephemeral locations) ───────────────────────

    public void putHash(String key, String field, String value) {
        if (redis == null) return;
        try {
            redis.opsForHash().put(key, field, value);
        } catch (Exception ex) {
            log.warn("Redis putHash failure for key '{}' field '{}': {}", key, field, ex.getMessage());
        }
    }

    public Optional<String> getHash(String key, String field) {
        if (redis == null) return Optional.empty();
        try {
            Object val = redis.opsForHash().get(key, field);
            return Optional.ofNullable(val != null ? val.toString() : null);
        } catch (Exception ex) {
            log.warn("Redis getHash failure for key '{}' field '{}': {}", key, field, ex.getMessage());
            return Optional.empty();
        }
    }

    public Map<Object, Object> getAllHash(String key) {
        if (redis == null) return Collections.emptyMap();
        try {
            return redis.opsForHash().entries(key);
        } catch (Exception ex) {
            log.warn("Redis getAllHash failure for key '{}': {}", key, ex.getMessage());
            return Collections.emptyMap();
        }
    }

    public void deleteHashField(String key, String field) {
        if (redis == null) return;
        try {
            redis.opsForHash().delete(key, field);
        } catch (Exception ex) {
            log.warn("Redis deleteHashField failure for key '{}' field '{}': {}", key, field, ex.getMessage());
        }
    }
}
