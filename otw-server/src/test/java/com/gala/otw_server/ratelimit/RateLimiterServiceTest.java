package com.gala.otw_server.ratelimit;

import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimiterServiceTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOps;

    @Test
    @DisplayName("checkRateLimit allows request when under limit")
    void checkRateLimit_Allowed() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.setIfAbsent(eq("ratelimit:user1"), eq("1"), any(Duration.class)))
                .thenReturn(true);

        RateLimiterService limiter = new RateLimiterService(redis);

        assertThatNoException().isThrownBy(() ->
                limiter.checkRateLimit("ratelimit:user1", Duration.ofSeconds(3))
        );
    }

    @Test
    @DisplayName("checkRateLimit throws TooManyRequestsException when rate limit is exceeded")
    void checkRateLimit_Exceeded() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.setIfAbsent(eq("ratelimit:user1"), eq("1"), any(Duration.class)))
                .thenReturn(false);

        RateLimiterService limiter = new RateLimiterService(redis);

        assertThatThrownBy(() ->
                limiter.checkRateLimit("ratelimit:user1", Duration.ofSeconds(3))
        ).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    @DisplayName("checkRateLimit falls back to in-memory sliding window when Redis is null")
    void checkRateLimit_InMemoryFallback() {
        RateLimiterService limiter = new RateLimiterService(null);

        // First request: allowed
        assertThatNoException().isThrownBy(() ->
                limiter.checkRateLimit("ratelimit:fallback:user2", Duration.ofSeconds(5))
        );

        // Immediate subsequent request: blocked
        assertThatThrownBy(() ->
                limiter.checkRateLimit("ratelimit:fallback:user2", Duration.ofSeconds(5))
        ).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    @DisplayName("checkRateLimit count-based allows up to maxRequests then blocks in memory")
    void checkRateLimit_CountBased_InMemory() {
        RateLimiterService limiter = new RateLimiterService(null);
        String key = "ratelimit:count:test";

        // Up to 3 requests allowed in 10s
        assertThatNoException().isThrownBy(() -> limiter.checkRateLimit(key, 3, Duration.ofSeconds(10)));
        assertThatNoException().isThrownBy(() -> limiter.checkRateLimit(key, 3, Duration.ofSeconds(10)));
        assertThatNoException().isThrownBy(() -> limiter.checkRateLimit(key, 3, Duration.ofSeconds(10)));

        // 4th request throws TooManyRequestsException
        assertThatThrownBy(() -> limiter.checkRateLimit(key, 3, Duration.ofSeconds(10)))
                .isInstanceOf(TooManyRequestsException.class);
    }
}
