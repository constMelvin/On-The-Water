package com.gala.otw_server.security.auth;

import com.gala.otw_server.common.DomainExceptions.InsufficientRoomRoleException;
import com.gala.otw_server.common.DomainExceptions.NotARoomMemberException;
import com.gala.otw_server.common.DomainExceptions.RoomArchivedException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.lang.reflect.Parameter;
import java.util.UUID;

/**
 * AOP before-advice for {@link RequireRoomRole}.
 *
 * <p>Execution order (cheapest to most expensive):
 * <ol>
 *   <li>JWT filter already validated the token before this runs.</li>
 *   <li>Extract {@code roomId} from the method's {@code @PathVariable UUID roomId} parameter.</li>
 *   <li>Query {@code room_members} for (roomId, currentUserId) — returns role or nothing.</li>
 *   <li>404 if the room doesn't exist (we check rooms existence separately to avoid enum attacks).</li>
 *   <li>403 if the user is not a member.</li>
 *   <li>403 if the user's role doesn't satisfy the required role.</li>
 * </ol>
 *
 * <p><b>Cache integration (Sprint 5):</b> wrap the DB query in a Redis cache-aside lookup
 * on key {@code room:{roomId}:member:{userId}}. At Sprint 1 we go straight to Postgres —
 * correctness first, performance later.
 */
@Aspect
@Component
public class RoomAccessAspect {

    private static final Logger log = LoggerFactory.getLogger(RoomAccessAspect.class);

    private final CurrentUserProvider currentUser;
    private final JdbcTemplate jdbc;
    private final com.gala.otw_server.cache.CacheService cacheService;

    public RoomAccessAspect(CurrentUserProvider currentUser,
                            JdbcTemplate jdbc,
                            com.gala.otw_server.cache.CacheService cacheService) {
        this.currentUser = currentUser;
        this.jdbc = jdbc;
        this.cacheService = cacheService;
    }

    @Before("@annotation(requireRoomRole)")
    public void enforce(JoinPoint jp, RequireRoomRole requireRoomRole) {
        UUID roomId = extractRoomId(jp);
        UUID userId = currentUser.getUserId();

        RoomRole required = requireRoomRole.value();

        String cacheKey = com.gala.otw_server.cache.CacheKeys.roomMember(roomId, userId);
        java.util.Optional<String> cachedRole = cacheService.get(cacheKey);

        String roleStr;
        if (cachedRole.isPresent()) {
            roleStr = cachedRole.get();
        } else {
            // Single query: join rooms + room_members to get room existence + membership + role in one shot.
            // Returns null if either the room doesn't exist or the user isn't a member.
            String sql = """
                    SELECT rm.role
                    FROM room_members rm
                    JOIN rooms r ON r.id = rm.room_id
                    WHERE rm.room_id = ? AND rm.user_id = ? AND rm.left_at IS NULL
                    """;

            try {
                roleStr = jdbc.queryForObject(sql, String.class, roomId, userId);
                cacheService.set(cacheKey, roleStr, com.gala.otw_server.cache.CacheKeys.TTL_MEMBERSHIP);
            } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
                // Either room doesn't exist or user isn't a member.
                // Return 404 in both cases to avoid leaking "room exists but you can't access it".
                if (!roomExists(roomId)) {
                    throw new RoomNotFoundException();
                }
                throw new NotARoomMemberException();
            }
        }

        RoomRole actual = parseRoomRole(roleStr);
        if (!actual.satisfies(required)) {
            log.debug("User {} has role {} but {} is required for room {}", userId, actual, required, roomId);
            throw new InsufficientRoomRoleException(required.name());
        }

        // Archived galas are read-only. Status is read fresh (never cached) so archive/restore
        // takes effect immediately; reads skip the query entirely.
        if (!requireRoomRole.allowArchived() && !isReadEndpoint(jp) && isArchived(roomId)) {
            throw new RoomArchivedException();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UUID extractRoomId(JoinPoint jp) {
        MethodSignature sig = (MethodSignature) jp.getSignature();
        Parameter[] params = sig.getMethod().getParameters();
        Object[] args = jp.getArgs();
        for (int i = 0; i < params.length; i++) {
            if ("roomId".equals(params[i].getName()) && args[i] instanceof UUID uuid) {
                return uuid;
            }
        }
        throw new IllegalStateException(
                "@RequireRoomRole used on a method without a UUID roomId parameter: " + sig.getMethod());
    }

    private boolean isReadEndpoint(JoinPoint jp) {
        java.lang.reflect.Method method = ((MethodSignature) jp.getSignature()).getMethod();
        if (method.isAnnotationPresent(GetMapping.class)) return true;
        RequestMapping mapping = method.getAnnotation(RequestMapping.class);
        return mapping != null && java.util.Arrays.asList(mapping.method()).contains(RequestMethod.GET);
    }

    private boolean isArchived(UUID roomId) {
        try {
            String status = jdbc.queryForObject(
                    "SELECT status FROM rooms WHERE id = ?", String.class, roomId);
            return "ARCHIVED".equals(status);
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new RoomNotFoundException();
        }
    }

    private boolean roomExists(UUID roomId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM rooms WHERE id = ?", Integer.class, roomId);
        return count != null && count > 0;
    }

    private RoomRole parseRoomRole(String raw) {
        try {
            return RoomRole.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Unknown room role '{}' in DB — defaulting to MEMBER", raw);
            return RoomRole.MEMBER;
        }
    }
}
