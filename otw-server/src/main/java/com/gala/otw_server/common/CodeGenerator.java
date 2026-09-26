package com.gala.otw_server.common;

import java.security.SecureRandom;

/**
 * Generates short, human-shareable join codes for rooms and groups.
 *
 * <p>Character set excludes visually ambiguous characters:
 * {@code 0} (zero), {@code O} (oh), {@code 1} (one), {@code I} (eye), {@code l} (ell).
 * This leaves 32 characters and 32^8 ≈ 1 trillion possible 8-character codes,
 * which is more than enough to make brute-force guessing impractical when combined
 * with the rate limit on the join endpoint.
 */
public final class CodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private CodeGenerator() {}

    /** Generates a random 8-character alphanumeric join code. */
    public static String generate() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
