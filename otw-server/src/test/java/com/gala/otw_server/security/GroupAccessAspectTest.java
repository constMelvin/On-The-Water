package com.gala.otw_server.security;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.GroupNotFoundException;
import com.gala.otw_server.common.DomainExceptions.InsufficientGroupRoleException;
import com.gala.otw_server.common.DomainExceptions.NotAGroupMemberException;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.GroupAccessAspect;
import com.gala.otw_server.security.auth.GroupRole;
import com.gala.otw_server.security.auth.RequireGroupRole;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Method;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupAccessAspectTest {

    @Mock
    private CurrentUserProvider currentUser;

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private CacheService cacheService;

    @Mock
    private JoinPoint joinPoint;

    @Mock
    private MethodSignature methodSignature;

    @Mock
    private RequireGroupRole requireGroupRole;

    private GroupAccessAspect aspect;

    private final UUID userId = UUID.randomUUID();
    private final UUID groupId = UUID.randomUUID();

    // Helper dummy method for parameter reflection
    @SuppressWarnings("unused")
    public void dummyGroupMethod(UUID groupId) {}

    @BeforeEach
    void setUp() throws NoSuchMethodException {
        aspect = new GroupAccessAspect(currentUser, jdbc, cacheService);

        Method method = getClass().getMethod("dummyGroupMethod", UUID.class);
        lenient().when(joinPoint.getSignature()).thenReturn(methodSignature);
        lenient().when(methodSignature.getMethod()).thenReturn(method);
        lenient().when(joinPoint.getArgs()).thenReturn(new Object[]{groupId});
        lenient().when(currentUser.getUserId()).thenReturn(userId);
    }

    @Test
    @DisplayName("Allows access when group role is cached and satisfies requirement")
    void cachedRole_satisfiesRequirement_allowed() {
        when(requireGroupRole.value()).thenReturn(GroupRole.MEMBER);
        when(cacheService.get("group:" + groupId + ":member:" + userId)).thenReturn(Optional.of("OWNER"));

        assertThatCode(() -> aspect.enforce(joinPoint, requireGroupRole))
                .doesNotThrowAnyException();

        verifyNoInteractions(jdbc);
    }

    @Test
    @DisplayName("Throws InsufficientGroupRoleException when member does not satisfy OWNER_OR_ADMIN")
    void cachedRole_insufficientRole_forbidden() {
        when(requireGroupRole.value()).thenReturn(GroupRole.ADMIN);
        when(cacheService.get("group:" + groupId + ":member:" + userId)).thenReturn(Optional.of("MEMBER"));

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireGroupRole))
                .isInstanceOf(InsufficientGroupRoleException.class);
    }

    @Test
    @DisplayName("Queries database on cache miss, caches role, and allows access")
    void cacheMiss_queriesDatabase_cachesAndAllows() {
        when(requireGroupRole.value()).thenReturn(GroupRole.MEMBER);
        when(cacheService.get("group:" + groupId + ":member:" + userId)).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("group_members")), eq(String.class), eq(groupId), eq(userId)))
                .thenReturn("MEMBER");

        assertThatCode(() -> aspect.enforce(joinPoint, requireGroupRole))
                .doesNotThrowAnyException();

        verify(cacheService).set(eq("group:" + groupId + ":member:" + userId), eq("MEMBER"), any());
    }

    @Test
    @DisplayName("Throws GroupNotFoundException when group does not exist")
    void cacheMiss_groupDoesNotExist_notFound() {
        when(requireGroupRole.value()).thenReturn(GroupRole.MEMBER);
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("group_members")), eq(String.class), eq(groupId), eq(userId)))
                .thenThrow(new EmptyResultDataAccessException(1));
        when(jdbc.queryForObject(eq("SELECT COUNT(1) FROM groups WHERE id = ?"), eq(Integer.class), eq(groupId)))
                .thenReturn(0);

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireGroupRole))
                .isInstanceOf(GroupNotFoundException.class);
    }

    @Test
    @DisplayName("Throws NotAGroupMemberException when group exists but user is not member")
    void cacheMiss_userNotMember_forbidden() {
        when(requireGroupRole.value()).thenReturn(GroupRole.MEMBER);
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("group_members")), eq(String.class), eq(groupId), eq(userId)))
                .thenThrow(new EmptyResultDataAccessException(1));
        when(jdbc.queryForObject(eq("SELECT COUNT(1) FROM groups WHERE id = ?"), eq(Integer.class), eq(groupId)))
                .thenReturn(1);

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireGroupRole))
                .isInstanceOf(NotAGroupMemberException.class);
    }
}
