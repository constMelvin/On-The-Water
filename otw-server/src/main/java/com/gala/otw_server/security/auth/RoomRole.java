package com.gala.otw_server.security.auth;

/**
 * Room-level roles, ordered from least to most privileged.
 * The ordering allows a simple {@code ordinal()} comparison for "role >= required".
 */
public enum RoomRole {
    MEMBER,
    HOST;

    /**
     * Returns {@code true} if this role meets or exceeds the required role.
     */
    public boolean satisfies(RoomRole required) {
        return this.ordinal() >= required.ordinal();
    }
}
