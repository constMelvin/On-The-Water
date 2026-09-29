package com.gala.otw_server.common;

import org.springframework.http.HttpStatus;

/**
 * Concrete domain exceptions.
 * Declare them here while the codebase is small; split into per-feature files
 * once each feature package starts growing its own exception set.
 */
public final class DomainExceptions {

    private DomainExceptions() {}

    // ── 401 Unauthenticated ─────────────────────────────────────────────────

    public static class UnauthenticatedException extends BaseException {
        public UnauthenticatedException() {
            super(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    // ── 403 Forbidden ───────────────────────────────────────────────────────

    public static class ForbiddenException extends BaseException {
        public ForbiddenException(String message) {
            super(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, message);
        }
    }

    public static class NotARoomMemberException extends BaseException {
        public NotARoomMemberException() {
            super(ErrorCode.NOT_A_ROOM_MEMBER, HttpStatus.FORBIDDEN, "You are not a member of this room");
        }
    }

    public static class InsufficientRoomRoleException extends BaseException {
        public InsufficientRoomRoleException(String required) {
            super(ErrorCode.INSUFFICIENT_ROOM_ROLE, HttpStatus.FORBIDDEN,
                    "This action requires room role: " + required);
        }
    }

    // ── 404 Not Found ───────────────────────────────────────────────────────

    public static class RoomNotFoundException extends BaseException {
        public RoomNotFoundException() {
            super(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, "Room not found");
        }
    }

    public static class MemberNotFoundException extends BaseException {
        public MemberNotFoundException() {
            super(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, "Member not found");
        }
    }

    public static class ItineraryItemNotFoundException extends BaseException {
        public ItineraryItemNotFoundException() {
            super(ErrorCode.ITINERARY_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND, "Itinerary item not found");
        }
    }

    public static class ChecklistItemNotFoundException extends BaseException {
        public ChecklistItemNotFoundException() {
            super(ErrorCode.CHECKLIST_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND, "Checklist item not found");
        }
    }

    public static class ExpenseNotFoundException extends BaseException {
        public ExpenseNotFoundException() {
            super(ErrorCode.EXPENSE_NOT_FOUND, HttpStatus.NOT_FOUND, "Expense not found");
        }
    }

    public static class PhotoNotFoundException extends BaseException {
        public PhotoNotFoundException() {
            super(ErrorCode.PHOTO_NOT_FOUND, HttpStatus.NOT_FOUND, "Photo not found");
        }
    }

    // ── 400 Bad Request ─────────────────────────────────────────────────────

    public static class InvalidRequestException extends BaseException {
        public InvalidRequestException(String message) {
            super(ErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST, message);
        }
    }

    // ── 429 Too Many Requests ───────────────────────────────────────────────

    public static class TooManyRequestsException extends BaseException {
        public TooManyRequestsException(String message) {
            super(ErrorCode.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    // ── 409 Conflict ────────────────────────────────────────────────────────

    public static class OptimisticLockConflictException extends BaseException {
        public OptimisticLockConflictException() {
            super(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, HttpStatus.CONFLICT,
                    "Another edit was made concurrently — please refresh and retry");
        }
    }

    public static class AlreadyAMemberException extends BaseException {
        public AlreadyAMemberException() {
            super(ErrorCode.ALREADY_A_MEMBER, HttpStatus.CONFLICT, "User is already a member");
        }
    }

    public static class DuplicateNicknameException extends BaseException {
        public DuplicateNicknameException() {
            super(ErrorCode.DUPLICATE_NICKNAME, HttpStatus.CONFLICT,
                    "That nickname is already taken by someone in this room");
        }
    }

    public static class InvalidCodeException extends BaseException {
        public InvalidCodeException() {
            super(ErrorCode.INVALID_CODE, HttpStatus.NOT_FOUND, "Invalid or expired join code");
        }
    }
}
