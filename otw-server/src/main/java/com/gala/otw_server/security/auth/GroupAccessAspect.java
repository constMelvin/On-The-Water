package com.gala.otw_server.security.auth;

import com.gala.otw_server.common.DomainExceptions.GroupNotFoundException;
import com.gala.otw_server.common.DomainExceptions.InsufficientGroupRoleException;
import com.gala.otw_server.common.DomainExceptions.NotAGroupMemberException;
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
 * AOP before-advice for {@link RequireGroupRole}.
 *
 * <p>Mirrors {@link RoomAccessAspect} but for the group tier.
 * Reads {@code groupId} from the method parameters, looks up the caller's
 * role in {@code group_members}, and enforces the minimum required role.
 *
 * <p><b>Cache integration (Sprint 5):</b> wrap with Redis cache-aside on
 * key {@code group:{groupId}:member:{userId}}.
 */
@Aspect
@Component
public class GroupAccessAspect {

    private static final Logger log = LoggerFactory.getLogger(GroupAccessAspect.class);

    private final CurrentUserProvider currentUser;
    private final JdbcTemplate jdbc;
    private final com.gala.otw_server.cache.CacheService cacheService;

    public GroupAccessAspect(CurrentUserProvider currentUser,
                             JdbcTemplate jdbc,
                             com.gala.otw_server.cache.CacheService cacheService) {
        this.currentUser = currentUser;
        this.jdbc = jdbc;
        this.cacheService = cacheService;
    }

    @Before("@annotation(requireGroupRole)")
    public void enforce(JoinPoint jp, RequireGroupRole requireGroupRole) {
        UUID groupId = extractGroupId(jp);
        UUID userId = currentUser.getUserId();

        GroupRole required = requireGroupRole.value();

        String cacheKey = com.gala.otw_server.cache.CacheKeys.groupMember(groupId, userId);
        java.util.Optional<String> cachedRole = cacheService.get(cacheKey);

        String roleStr;
        if (cachedRole.isPresent()) {
            roleStr = cachedRole.get();
        } else {
            String sql = """
                    SELECT gm.role
                    FROM group_members gm
                    JOIN groups g ON g.id = gm.group_id
                    WHERE gm.group_id = ? AND gm.user_id = ? AND g.status = 'ACTIVE' AND gm.left_at IS NULL
                    """;

            try {
                roleStr = jdbc.queryForObject(sql, String.class, groupId, userId);
                cacheService.set(cacheKey, roleStr, com.gala.otw_server.cache.CacheKeys.TTL_MEMBERSHIP);
            } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
                if (!groupExists(groupId)) {
                    throw new GroupNotFoundException();
                }
                throw new NotAGroupMemberException();
            }
        }

        GroupRole actual = parseGroupRole(roleStr);
        if (!actual.satisfies(required)) {
            log.debug("User {} has group role {} but {} is required for group {}", userId, actual, required, groupId);
            throw new InsufficientGroupRoleException(required.name());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UUID extractGroupId(JoinPoint jp) {
        MethodSignature sig = (MethodSignature) jp.getSignature();
        Parameter[] params = sig.getMethod().getParameters();
        Object[] args = jp.getArgs();
        for (int i = 0; i < params.length; i++) {
            if ("groupId".equals(params[i].getName()) && args[i] instanceof UUID uuid) {
                return uuid;
            }
        }
        throw new IllegalStateException(
                "@RequireGroupRole used on a method without a UUID groupId parameter: " + sig.getMethod());
    }

    private boolean groupExists(UUID groupId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM groups WHERE id = ?", Integer.class, groupId);
        return count != null && count > 0;
    }

    private GroupRole parseGroupRole(String raw) {
        try {
            return GroupRole.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Unknown group role '{}' in DB — defaulting to MEMBER", raw);
            return GroupRole.MEMBER;
        }
    }
}
