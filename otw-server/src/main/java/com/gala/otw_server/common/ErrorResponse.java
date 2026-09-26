package com.gala.otw_server.common;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Standard error response body shape.
 * Every non-2xx response from this API uses this record.
 *
 * <p>Example: {@code {"code":"ROOM_NOT_FOUND","message":"Room not found"}}
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String code,
        String message
) {
    public static ErrorResponse of(ErrorCode code, String message) {
        return new ErrorResponse(code.name(), message);
    }
}
