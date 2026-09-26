package com.gala.otw_server.common;

import org.springframework.http.HttpStatus;

/**
 * Base class for all domain exceptions.
 * Every subclass declares its own ErrorCode and HTTP status so the
 * GlobalExceptionHandler can map them without a giant if/else chain.
 */
public abstract class BaseException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus httpStatus;

    protected BaseException(ErrorCode errorCode, HttpStatus httpStatus, String message) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
