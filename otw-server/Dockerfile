# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# 1. Copy build descriptors first to leverage layer caching for dependencies
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B -q || true

# 2. Copy source code and build production artifact
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B -q

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Install curl for healthcheck probe
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Create dedicated non-root system group and user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy executable jar from builder stage with non-root ownership
COPY --from=builder --chown=appuser:appgroup /build/target/*.jar app.jar

# Drop all privileges to run as non-root
USER 1001

EXPOSE 8080

# Healthcheck monitoring Spring Boot Actuator endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM memory: a fixed cap instead of a percentage. Railway lets a container grow to the plan's
# limit (GBs), so "75% of RAM" would let the heap — and the bill — grow far past what OTW needs.
# Measured: ~370 MB for the whole process (vs ~450 MB with JVM defaults), same startup time.
# Don't cap the JIT code cache: it filled up and made startup ~30 s slower.
# Override with a JAVA_TOOL_OPTIONS variable on Railway if needed.
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xss512k -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
