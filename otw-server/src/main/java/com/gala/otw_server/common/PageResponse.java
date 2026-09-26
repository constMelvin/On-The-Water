package com.gala.otw_server.common;

import java.util.List;

/**
 * Cursor-based paginated response wrapper.
 *
 * <p>All list endpoints return this shape so clients have a consistent
 * pagination contract. {@code nextCursor} is {@code null} when there are no
 * more pages (i.e. the returned items count < limit, or you're on the last page).
 *
 * @param <T> the item DTO type
 */
public record PageResponse<T>(
        List<T> items,
        String nextCursor,
        int limit
) {
    public static <T> PageResponse<T> of(List<T> items, String nextCursor, int limit) {
        return new PageResponse<>(items, nextCursor, limit);
    }

    /** Convenience factory for the last page (no more items). */
    public static <T> PageResponse<T> last(List<T> items, int limit) {
        return new PageResponse<>(items, null, limit);
    }
}
