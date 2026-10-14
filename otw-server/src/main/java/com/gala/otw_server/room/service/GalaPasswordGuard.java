package com.gala.otw_server.room.service;

import com.gala.otw_server.common.DomainExceptions.InvalidGalaPasswordException;
import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.room.entity.Room;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * Checks a Gala Password with two locks on wrong guesses, both over {@link #WINDOW}:
 * <ul>
 *   <li>per account and gala: after {@link #MAX_FAILURES_PER_USER} wrong passwords, that account
 *       can't try this gala's password again until the window ends (everyone else still can);</li>
 *   <li>per gala: after {@link #MAX_FAILURES_PER_GALA} wrong passwords from anyone, the gala refuses
 *       all password attempts. Accounts are free, so this caps guessing by rotating accounts.</li>
 * </ul>
 * Gala Codes are public (Join a Gala directory), so the per-gala lock alone would let anyone block
 * a gala's joins with a handful of wrong guesses; the per-gala ceiling is set high so that takes
 * many accounts.
 */
@Component
public class GalaPasswordGuard {

    static final int MAX_FAILURES_PER_USER = 5;
    static final int MAX_FAILURES_PER_GALA = 100;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final PasswordEncoder passwordEncoder;
    private final RateLimiterService rateLimiter;

    public GalaPasswordGuard(PasswordEncoder passwordEncoder, RateLimiterService rateLimiter) {
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    /** 429 while locked (for this account or the whole gala); 401 INVALID_GALA_PASSWORD for a wrong (or never set) password. */
    public void verify(Room room, UUID callerId, String password) {
        String galaKey = "ratelimit:gala-password:" + room.getId();
        String userKey = galaKey + ":" + callerId;
        // Checked before BCrypt, so a locked gala also costs no hashing work.
        if (rateLimiter.isOverCount(userKey, MAX_FAILURES_PER_USER)) {
            throw new TooManyRequestsException(
                    "Too many wrong Gala Password tries. Try again in 15 minutes.");
        }
        if (rateLimiter.isOverCount(galaKey, MAX_FAILURES_PER_GALA)) {
            throw new TooManyRequestsException(
                    "Too many wrong Gala Password tries for this gala. Try again in 15 minutes.");
        }
        if (room.getPasswordHash() == null || !passwordEncoder.matches(password, room.getPasswordHash())) {
            rateLimiter.tryAcquireCount(userKey, MAX_FAILURES_PER_USER, WINDOW);
            rateLimiter.tryAcquireCount(galaKey, MAX_FAILURES_PER_GALA, WINDOW);
            throw new InvalidGalaPasswordException();
        }
    }
}
