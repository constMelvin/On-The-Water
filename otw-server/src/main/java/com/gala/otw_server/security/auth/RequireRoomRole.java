package com.gala.otw_server.security.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the minimum {@link RoomRole} required to invoke the annotated endpoint.
 *
 * <p>The annotated method must have a {@code @PathVariable UUID roomId} parameter.
 * The {@link RoomAccessAspect} intercepts the call before the method body runs,
 * checks room membership + role from the DB (cache-first), and throws a
 * {@code 403 Forbidden} if the requirement is not met.
 *
 * <p>Usage:
 * <pre>{@code
 * @RequireRoomRole(RoomRole.HOST)
 * @DeleteMapping("/rooms/{roomId}/members/{userId}")
 * public void removeMember(@PathVariable UUID roomId, ...) { ... }
 * }</pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRoomRole {
    RoomRole value() default RoomRole.MEMBER;
}
