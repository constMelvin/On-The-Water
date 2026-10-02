package com.gala.otw_server.common;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Stand-ins for "no timestamp" in keyset queries. A null timestamp bound to
 * "(:p IS NULL OR col < :p)" makes PostgreSQL fail with "could not determine data type
 * of parameter", so callers bind one of these real values instead of null.
 */
public final class CursorBounds {

    /** First page of a newest-first list: every row is older than this. */
    public static final OffsetDateTime NEWEST = OffsetDateTime.of(9999, 12, 31, 0, 0, 0, 0, ZoneOffset.UTC);

    private CursorBounds() {}
}
