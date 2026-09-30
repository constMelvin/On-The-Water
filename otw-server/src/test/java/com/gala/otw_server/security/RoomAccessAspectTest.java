package com.gala.otw_server.security;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.InsufficientRoomRoleException;
import com.gala.otw_server.common.DomainExceptions.NotARoomMemberException;
import com.gala.otw_server.common.DomainExceptions.RoomArchivedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomAccessAspect;
import com.gala.otw_server.security.auth.RoomRole;
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
class RoomAccessAspectTest {

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
    private RequireRoomRole requireRoomRole;

    private RoomAccessAspect aspect;

    private final UUID userId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();

    // Helper dummy methods for parameter/annotation reflection
    @SuppressWarnings("unused")
    @GetMapping("/dummy")
    public void dummyRoomMethod(UUID roomId) {}

    @SuppressWarnings("unused")
    @PostMapping("/dummy")
    public void dummyWriteMethod(UUID roomId) {}

    private void useWriteMethod() throws NoSuchMethodException {
        Method method = getClass().getMethod("dummyWriteMethod", UUID.class);
        when(methodSignature.getMethod()).thenReturn(method);
    }

    @BeforeEach
    void setUp() throws NoSuchMethodException {
        aspect = new RoomAccessAspect(currentUser, jdbc, cacheService);

        Method method = getClass().getMethod("dummyRoomMethod", UUID.class);
        lenient().when(joinPoint.getSignature()).thenReturn(methodSignature);
        lenient().when(methodSignature.getMethod()).thenReturn(method);
        lenient().when(joinPoint.getArgs()).thenReturn(new Object[]{roomId});
        lenient().when(currentUser.getUserId()).thenReturn(userId);
    }

    @Test
    @DisplayName("Allows access when role is cached and satisfies requirement")
    void cachedRole_satisfiesRequirement_allowed() {
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(cacheService.get("room:" + roomId + ":member:" + userId)).thenReturn(Optional.of("HOST"));

        assertThatCode(() -> aspect.enforce(joinPoint, requireRoomRole))
                .doesNotThrowAnyException();

        verifyNoInteractions(jdbc);
    }

    @Test
    @DisplayName("Throws InsufficientRoomRoleException when cached role does not satisfy requirement")
    void cachedRole_insufficientRole_forbidden() {
        when(requireRoomRole.value()).thenReturn(RoomRole.HOST);
        when(cacheService.get("room:" + roomId + ":member:" + userId)).thenReturn(Optional.of("MEMBER"));

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireRoomRole))
                .isInstanceOf(InsufficientRoomRoleException.class);
    }

    @Test
    @DisplayName("Queries database on cache miss, caches role, and allows access")
    void cacheMiss_queriesDatabase_cachesAndAllows() {
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(cacheService.get("room:" + roomId + ":member:" + userId)).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("room_members")), eq(String.class), eq(roomId), eq(userId)))
                .thenReturn("MEMBER");

        assertThatCode(() -> aspect.enforce(joinPoint, requireRoomRole))
                .doesNotThrowAnyException();

        verify(cacheService).set(eq("room:" + roomId + ":member:" + userId), eq("MEMBER"), any());
    }

    @Test
    @DisplayName("Throws RoomNotFoundException when room does not exist")
    void cacheMiss_roomDoesNotExist_notFound() {
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("room_members")), eq(String.class), eq(roomId), eq(userId)))
                .thenThrow(new EmptyResultDataAccessException(1));
        when(jdbc.queryForObject(eq("SELECT COUNT(1) FROM rooms WHERE id = ?"), eq(Integer.class), eq(roomId)))
                .thenReturn(0);

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireRoomRole))
                .isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    @DisplayName("Write to an archived gala is rejected with RoomArchivedException")
    void archivedRoom_write_rejected() throws NoSuchMethodException {
        useWriteMethod();
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(requireRoomRole.allowArchived()).thenReturn(false);
        when(cacheService.get(anyString())).thenReturn(Optional.of("MEMBER"));
        when(jdbc.queryForObject(eq("SELECT status FROM rooms WHERE id = ?"), eq(String.class), eq(roomId)))
                .thenReturn("ARCHIVED");

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireRoomRole))
                .isInstanceOf(RoomArchivedException.class);
    }

    @Test
    @DisplayName("Write to an archived gala passes when the endpoint allows archived (restore/delete/leave)")
    void archivedRoom_allowArchived_passes() throws NoSuchMethodException {
        useWriteMethod();
        when(requireRoomRole.value()).thenReturn(RoomRole.HOST);
        when(requireRoomRole.allowArchived()).thenReturn(true);
        when(cacheService.get(anyString())).thenReturn(Optional.of("HOST"));

        assertThatCode(() -> aspect.enforce(joinPoint, requireRoomRole)).doesNotThrowAnyException();
        verifyNoInteractions(jdbc);
    }

    @Test
    @DisplayName("Write to an active gala passes after the status check")
    void activeRoom_write_passes() throws NoSuchMethodException {
        useWriteMethod();
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(requireRoomRole.allowArchived()).thenReturn(false);
        when(cacheService.get(anyString())).thenReturn(Optional.of("MEMBER"));
        when(jdbc.queryForObject(eq("SELECT status FROM rooms WHERE id = ?"), eq(String.class), eq(roomId)))
                .thenReturn("ACTIVE");

        assertThatCode(() -> aspect.enforce(joinPoint, requireRoomRole)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Throws NotARoomMemberException when room exists but user is not a member")
    void cacheMiss_userNotMember_forbidden() {
        when(requireRoomRole.value()).thenReturn(RoomRole.MEMBER);
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForObject(argThat(s -> s != null && s.contains("room_members")), eq(String.class), eq(roomId), eq(userId)))
                .thenThrow(new EmptyResultDataAccessException(1));
        when(jdbc.queryForObject(eq("SELECT COUNT(1) FROM rooms WHERE id = ?"), eq(Integer.class), eq(roomId)))
                .thenReturn(1);

        assertThatThrownBy(() -> aspect.enforce(joinPoint, requireRoomRole))
                .isInstanceOf(NotARoomMemberException.class);
    }
}
