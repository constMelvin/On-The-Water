package com.gala.otw_server.security.auth;

/**
 * Group-level roles, ordered from least to most privileged.
 */
public enum GroupRole {
    MEMBER,
    ADMIN,
    OWNER;

    /**
     * Returns {@code true} if this role meets or exceeds the required role.
     */
    public boolean satisfies(GroupRole required) {
        return this.ordinal() >= required.ordinal();
    }
}
