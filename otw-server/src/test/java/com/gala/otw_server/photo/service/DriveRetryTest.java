package com.gala.otw_server.photo.service;

import com.google.api.client.googleapis.json.GoogleJsonError;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpResponseException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DriveRetryTest {

    private final List<Long> sleeps = new ArrayList<>();

    @BeforeEach
    void noRealSleeping() {
        DriveRetry.sleeper = sleeps::add;
    }

    @AfterEach
    void restoreSleeper() {
        DriveRetry.sleeper = Thread::sleep;
    }

    static GoogleJsonResponseException driveError(int status, String reason) {
        GoogleJsonError details = new GoogleJsonError();
        details.setCode(status);
        if (reason != null) {
            GoogleJsonError.ErrorInfo info = new GoogleJsonError.ErrorInfo();
            info.setReason(reason);
            details.setErrors(List.of(info));
        }
        return new GoogleJsonResponseException(
                new HttpResponseException.Builder(status, "err", new HttpHeaders()), details);
    }

    @Test
    @DisplayName("retries 429 and 503, then returns the result")
    void retriesTransientThenSucceeds() throws IOException {
        AtomicInteger calls = new AtomicInteger();
        String result = DriveRetry.call(() -> switch (calls.incrementAndGet()) {
            case 1 -> throw driveError(429, null);
            case 2 -> throw driveError(503, null);
            default -> "ok";
        });

        assertThat(result).isEqualTo("ok");
        assertThat(calls).hasValue(3);
        assertThat(sleeps).hasSize(2);
        assertThat(sleeps.get(0)).isBetween(500L, 749L);
        assertThat(sleeps.get(1)).isBetween(1000L, 1249L);
    }

    @Test
    @DisplayName("gives up after 3 attempts and rethrows the last error")
    void givesUpAfterMaxAttempts() {
        AtomicInteger calls = new AtomicInteger();
        assertThatThrownBy(() -> DriveRetry.call(() -> {
            calls.incrementAndGet();
            throw driveError(500, null);
        })).isInstanceOf(GoogleJsonResponseException.class);
        assertThat(calls).hasValue(DriveRetry.MAX_ATTEMPTS);
    }

    @Test
    @DisplayName("does not retry 400 or 404")
    void noRetryOnClientErrors() {
        for (int status : new int[]{400, 404}) {
            AtomicInteger calls = new AtomicInteger();
            assertThatThrownBy(() -> DriveRetry.call(() -> {
                calls.incrementAndGet();
                throw driveError(status, null);
            })).isInstanceOf(GoogleJsonResponseException.class);
            assertThat(calls).hasValue(1);
        }
        assertThat(sleeps).isEmpty();
    }

    @Test
    @DisplayName("retries a 403 only when Drive says it's a rate limit")
    void retries403RateLimitOnly() throws IOException {
        AtomicInteger calls = new AtomicInteger();
        assertThat(DriveRetry.call(() -> {
            if (calls.incrementAndGet() == 1) throw driveError(403, "userRateLimitExceeded");
            return "ok";
        })).isEqualTo("ok");

        AtomicInteger denied = new AtomicInteger();
        assertThatThrownBy(() -> DriveRetry.call(() -> {
            denied.incrementAndGet();
            throw driveError(403, "insufficientFilePermissions");
        })).isInstanceOf(GoogleJsonResponseException.class);
        assertThat(denied).hasValue(1);
    }

    @Test
    @DisplayName("retries socket timeouts but not other IO errors")
    void timeoutsRetriedPlainIoNot() throws IOException {
        AtomicInteger calls = new AtomicInteger();
        assertThat(DriveRetry.call(() -> {
            if (calls.incrementAndGet() == 1) throw new SocketTimeoutException("slow");
            return 1;
        })).isEqualTo(1);

        AtomicInteger plain = new AtomicInteger();
        assertThatThrownBy(() -> DriveRetry.call(() -> {
            plain.incrementAndGet();
            throw new IOException("boom");
        })).isInstanceOf(IOException.class);
        assertThat(plain).hasValue(1);
    }
}
