package com.gala.otw_server.security.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an endpoint (or every endpoint of a controller) as account-only: My Galas,
 * history, calendar, notifications. Anonymous Supabase sessions get
 * {@code 401 ACCOUNT_REQUIRED} so the frontend can route to "Create an Account".
 *
 * <p>Everything inside a gala works without an account; this is only for the
 * personal, cross-gala features.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireAccount {}
