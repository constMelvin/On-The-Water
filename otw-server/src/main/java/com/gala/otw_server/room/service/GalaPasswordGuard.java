package com.gala.otw_server.room.service;

import com.gala.otw_server.common.DomainExceptions.InvalidGalaPasswordException;
import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.room.entity.Room;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Checks a Gala Password with a per-gala lock on wrong guesses. The request rate limit is per
 * account, and accounts are free, so without this one gala's password could be guessed by
 * rotating accounts. After {@link #MAX_FAILURES} wrong passwords in {@link #WINDOW} (from anyone),
 * the gala refuses password attempts until the window ends.
 */
@Component
public class GalaPasswordGuard {

    static final int MAX_FAILURES = 20;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final PasswordEncoder passwordEncoder;
    private final RateLimiterService rateLimiter;

    public GalaPasswordGuard(PasswordEncoder passwordEncoder, RateLimiterService rateLimiter) {
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    /** 429 while the gala is locked; 401 INVALID_GALA_PASSWORD for a wrong (or never set) password. */
    public void verify(Room room, String password) {
        String key = "ratelimit:gala-password:" + room.getId();
        // Checked before BCrypt, so a locked gala also costs no hashing work.
        if (rateLimiter.isOverCount(key, MAX_FAILURES)) {
            throw new TooManyRequestsException(
                    "Too many wrong Gala Password tries for this gala. Try again in 15 minutes.");
        }
        if (room.getPasswordHash() == null || !passwordEncoder.matches(password, room.getPasswordHash())) {
            rateLimiter.tryAcquireCount(key, MAX_FAILURES, WINDOW);
            throw new InvalidGalaPasswordException();
        }
    }
}
