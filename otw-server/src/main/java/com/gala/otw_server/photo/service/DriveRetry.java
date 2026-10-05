package com.gala.otw_server.photo.service;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Retries a Google Drive call on transient failures (429 rate limit, 5xx, timeouts) with
 * exponential backoff and jitter: up to {@value #MAX_ATTEMPTS} attempts, ~0.5 s then ~1 s apart.
 * Use only for idempotent calls; anything else is rethrown at once.
 */
public final class DriveRetry {

    private static final Logger log = LoggerFactory.getLogger(DriveRetry.class);

    static final int MAX_ATTEMPTS = 3;
    private static final long BASE_DELAY_MS = 500;

    @FunctionalInterface
    public interface DriveCall<T> {
        T execute() throws IOException;
    }

    @FunctionalInterface
    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }

    /** Swapped out by tests so they don't actually wait. */
    static Sleeper sleeper = Thread::sleep;

    private DriveRetry() {}

    public static <T> T call(DriveCall<T> call) throws IOException {
        for (int attempt = 1; ; attempt++) {
            try {
                return call.execute();
            } catch (IOException ex) {
                if (attempt >= MAX_ATTEMPTS || !isTransient(ex)) throw ex;
                log.info("Transient Drive error (attempt {}/{}): {}", attempt, MAX_ATTEMPTS, ex.getMessage());
                pause(attempt);
            }
        }
    }

    /** True for HTTP statuses worth retrying: 429 and the usual 5xx. */
    public static boolean isRetryableStatus(int status) {
        return status == 429 || status == 500 || status == 502 || status == 503 || status == 504;
    }

    /** Waits before attempt {@code attempt + 1}: 500 ms, 1 s, ... plus up to 250 ms of jitter. */
    public static void pause(int attempt) throws IOException {
        long delay = BASE_DELAY_MS * (1L << (attempt - 1)) + ThreadLocalRandom.current().nextLong(250);
        try {
            sleeper.sleep(delay);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while retrying a Drive call", ex);
        }
    }

    private static boolean isTransient(IOException ex) {
        if (ex instanceof GoogleJsonResponseException g) {
            return isRetryableStatus(g.getStatusCode()) || isRateLimit403(g);
        }
        return ex instanceof SocketTimeoutException;
    }

    /** Drive also signals rate limits as 403 with reason rateLimitExceeded / userRateLimitExceeded. */
    private static boolean isRateLimit403(GoogleJsonResponseException g) {
        if (g.getStatusCode() != 403 || g.getDetails() == null || g.getDetails().getErrors() == null) return false;
        return g.getDetails().getErrors().stream()
                .anyMatch(e -> e.getReason() != null && e.getReason().endsWith("ateLimitExceeded"));
    }
}
