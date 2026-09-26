package com.gala.otw_server.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Loads .env file into System properties before Spring Boot context initializes,
 * allowing standard Spring ${PROPERTY_NAME} placeholders to resolve in local development.
 * Real OS environment variables will always take precedence.
 */
public final class DotenvLoader {

    private static final Logger log = LoggerFactory.getLogger(DotenvLoader.class);

    private DotenvLoader() {}

    public static void load() {
        Path[] possiblePaths = new Path[] {
                Path.of(".env"),
                Path.of("..", ".env"),
                Path.of("otw-server", ".env")
        };

        for (Path path : possiblePaths) {
            if (Files.exists(path)) {
                log.info("Loading environment variables from: {}", path.toAbsolutePath());
                loadFromPath(path);
                return;
            }
        }
        log.debug("No .env file found in candidate locations.");
    }

    private static void loadFromPath(Path path) {
        try (BufferedReader reader = Files.newBufferedReader(path)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                int eqIdx = line.indexOf('=');
                if (eqIdx <= 0) {
                    continue;
                }

                String key = line.substring(0, eqIdx).trim();
                String value = line.substring(eqIdx + 1).trim();

                // Strip outer quotes if present
                if ((value.startsWith("\"") && value.endsWith("\"")) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }

                // Only set if not already set in System.getenv or System.getProperties
                if (System.getenv(key) == null && System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to load .env file from {}: {}", path, e.getMessage());
        }
    }
}
