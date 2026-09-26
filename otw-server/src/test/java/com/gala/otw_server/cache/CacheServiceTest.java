package com.gala.otw_server.cache;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CacheServiceTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOps;

    @Test
    @DisplayName("get returns value when Redis succeeds")
    void get_Success() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("test-key")).thenReturn("cached-data");

        CacheService cacheService = new CacheService(redis);
        Optional<String> result = cacheService.get("test-key");

        assertThat(result).contains("cached-data");
    }

    @Test
    @DisplayName("get falls back gracefully on Redis outage without throwing")
    void get_RedisFailureFallback() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("test-key")).thenThrow(new RedisConnectionFailureException("Connection refused"));

        CacheService cacheService = new CacheService(redis);

        Optional<String> result = cacheService.get("test-key");
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("set handles Redis failure gracefully without throwing")
    void set_RedisFailureGraceful() {
        when(redis.opsForValue()).thenReturn(valueOps);
        doThrow(new RedisConnectionFailureException("Connection timeout"))
                .when(valueOps).set(eq("key"), eq("val"), any(Duration.class));

        CacheService cacheService = new CacheService(redis);

        assertThatNoException().isThrownBy(() ->
                cacheService.set("key", "val", Duration.ofMinutes(1))
        );
    }
}
