package com.gala.otw_server.security.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the minimum {@link GroupRole} required to invoke the annotated endpoint.
 *
 * <p>The annotated method must have a {@code @PathVariable UUID groupId} parameter.
 * The {@link GroupAccessAspect} intercepts the call before the method body runs,
 * checks group membership + role from the DB (cache-first), and throws a
 * {@code 403 Forbidden} if the requirement is not met.
 *
 * <p>Usage:
 * <pre>{@code
 * @RequireGroupRole(GroupRole.ADMIN)
 * @DeleteMapping("/groups/{groupId}/members/{userId}")
 * public void removeMember(@PathVariable UUID groupId, ...) { ... }
 * }</pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireGroupRole {
    GroupRole value() default GroupRole.MEMBER;
}
