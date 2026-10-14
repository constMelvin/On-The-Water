package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.ratelimit.RateLimiterService;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * Per-account limits on opening Drive upload links. Every upload lands in the one Drive account the
 * server signs in as, so without these one account could fill its storage for every gala (the general
 * 60 writes/min would still allow about 18 GB a minute of 300 MB videos).
 * <ul>
 *   <li>Gala Dump: {@link #GALA_BYTES_PER_DAY} of declared file size per account per day. A file that
 *       doesn't fit is refused and not counted.</li>
 *   <li>Profile photos: {@link #PROFILE_LINKS_PER_HOUR} upload links per account per hour.</li>
 * </ul>
 * The size counted is the one the client declares; the Drive session is opened for exactly that size.
 */
@Component
public class DriveUploadBudget {

    static final long GALA_BYTES_PER_DAY = 2L * 1024 * 1024 * 1024;
    static final int PROFILE_LINKS_PER_HOUR = 10;

    private final RateLimiterService rateLimiter;

    public DriveUploadBudget(RateLimiterService rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    /** 429 when this file would take the account over its daily Gala Dump budget. */
    public void chargeGalaUpload(UUID userId, long size) {
        if (!rateLimiter.tryAcquireAmount("ratelimit:upload-bytes:" + userId, size, GALA_BYTES_PER_DAY, Duration.ofDays(1))) {
            throw new TooManyRequestsException("You've hit today's upload limit (2 GB). Try again tomorrow.");
        }
    }

    /** 429 after too many profile photo upload links in an hour. */
    public void chargeProfileUpload(UUID userId) {
        if (!rateLimiter.tryAcquireCount("ratelimit:profile-upload:" + userId, PROFILE_LINKS_PER_HOUR, Duration.ofHours(1))) {
            throw new TooManyRequestsException("Too many profile photo uploads. Try again in an hour.");
        }
    }
}
