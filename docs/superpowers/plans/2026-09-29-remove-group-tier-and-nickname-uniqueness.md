# Remove Group Tier & Enforce Nickname Uniqueness — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot `otw-server` from the two-tier Group+Room model to the flat Room-only model described in `docs/OTW - WEB.pdf`'s Week 1–3 backend tasking, close the one real gap that tasking calls out (per-room nickname uniqueness), and — overriding the PDF's "no login ever" flow at the product owner's request (2026-09-29) — require a registered account for every non-public endpoint by rejecting anonymous Supabase sessions. Backend only; frontend/UI is out of scope and owned by other collaborators.

**Architecture:** Delete the `group` feature package and its `@RequireGroupRole`/`GroupRole`/`GroupAccessAspect` authorization primitives first (safe while the DB tables still physically exist, because `spring.jpa.hibernate.ddl-auto=validate` only validates *mapped* entities — deleting the Java mapping first avoids a startup-validation failure window). Then decouple `Room`/`RoomMember` from `Group` in code. Only then drop the `groups`/`group_members` tables and the `group_id` column via a new Flyway migration. Then add a partial unique index + service-level check for per-room nickname uniqueness. Finally, add a `NotAnonymousJwtValidator` to the existing `JwtDecoder` validator chain so tokens with `is_anonymous: true` (or no email) fail verification with `401 ACCOUNT_REQUIRED` before any controller runs — today `docs/vault/Auth.md` says anonymous users are treated like email users, which this plan deliberately reverses.

**Tech Stack:** Java 21, Spring Boot (Web, Data JPA, Security OAuth2 Resource Server, AOP), PostgreSQL (Supabase), Flyway, JUnit 5 + Mockito + AssertJ, Testcontainers (Postgres + Redis) for context-load verification.

**Spec:** `docs/OTW - WEB.pdf` §"PROJECT TASKING" (Week 1 tickets D1-04, D1-05, D2-03, D3-04) is the new source for this pivot. `docs/OTW_Backend_Master_Plan.md` and `docs/vault/{Schema,Structure,Auth,API}.md` are the *previously* authoritative docs this plan intentionally diverges from — Task 6 updates them so spec and code don't drift, per `AGENTS.md`'s document-priority rule.

## Global Constraints

- Postgres is the source of truth; Redis is disposable and must degrade gracefully, never 500. (AGENTS.md rule 3)
- Every room-scoped endpoint must go through `@RequireRoomRole` — never trust a `roomId` in a path/body without it. (AGENTS.md rule 4)
- Money: `BigDecimal`, scale 2, `HALF_UP` — untouched by this plan, but no task here may introduce `double`/`float` money handling. (AGENTS.md rule 5)
- No unbounded collection endpoints — untouched by this plan; don't remove existing pagination while editing `RoomController`/`RoomService`. (AGENTS.md rule 6)
- Mutations other participants should see emit a realtime event **after** the DB transaction commits. (AGENTS.md rule 7)
- `userId` comes from the JWT `sub` claim only. The backend never issues, stores, or refreshes tokens — it only verifies them. (AGENTS.md AUTH MODEL)
- Every non-public endpoint requires a **registered** Supabase account (email/OTP or password, per AGENTS.md). Anonymous Supabase sessions are rejected at the JWT-validation layer, fail-closed: a token is rejected if `is_anonymous` is `true` **or** the `email` claim is blank.
- Do not perform large rewrites when a targeted change is sufficient (AGENTS.md rule 11) — this plan touches only the `group` package, `Room`/`RoomMember` plumbing, and the nickname-join path. It does not touch `itinerary`, `checklist`, `budget`, `expense`, `location`, or `photo` packages, which have no Group coupling.
- Never edit a Flyway migration that has already run in a shared environment — add a new one instead (`V4`, `V5`). (`docs/vault/Schema.md`)

## Review Focus

- **Dropping `group_id`/`groups`/`group_members` while `Group.java` is still an active JPA `@Entity`** would fail Spring Boot startup under `spring.jpa.hibernate.ddl-auto=validate` (validate mode requires every mapped table/column to exist) — Task order below removes the Java mapping in Task 1–2 *before* the schema drop in Task 3, and Task 3's own test is "the app still boots," which catches this if the order is ever violated.
- **A user who left a room and rejoins under a nickname someone else is currently using while they were gone** must be allowed to reuse a nickname freed by another member leaving, but blocked from colliding with an *active* member — the nickname uniqueness index and repository check both scope to `left_at IS NULL`, and Task 4 has an explicit test for the "left, nickname now free" case.
- **Two concurrent join requests with the same nickname** (TOCTOU race between the pre-check and the insert) must not both succeed — Task 4 adds both an application-level pre-check *and* a DB partial unique index, with a test that simulates the DB rejecting the second insert after the pre-check already passed.
- **Case-only nickname differences** ("Miguel" vs "miguel") read as the same person to a human in a room roster and must collide, not silently coexist — Task 4's index uses `LOWER(nickname)` and the repository method is explicitly `IgnoreCase`; a test pins this.
- **An anonymous Supabase token whose `is_anonymous` claim is missing or unexpected** must still be rejected, not waved through — Task 6's validator is fail-closed (it also rejects a blank `email`), and a test pins the "no `is_anonymous` claim, no email" case. The frontend also needs a *distinguishable* error to route the user to sign-in instead of showing a generic failure — Task 6 tests that the rejection maps to `ACCOUNT_REQUIRED`, not the generic `UNAUTHENTICATED`.

---

### Task 1: Delete the Group authorization primitives and feature package

**Files:**
- Delete: `otw-server/src/main/java/com/gala/otw_server/security/auth/RequireGroupRole.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/security/auth/GroupRole.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/security/auth/GroupAccessAspect.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/controller/GroupController.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/service/GroupService.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/repository/GroupRepository.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/repository/GroupMemberRepository.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/entity/Group.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/entity/GroupMember.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/dto/GroupDto.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/dto/GroupMemberDto.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/dto/CreateGroupRequest.java`
- Delete: `otw-server/src/main/java/com/gala/otw_server/group/dto/JoinGroupRequest.java`
- Delete: `otw-server/src/test/java/com/gala/otw_server/group/GroupServiceTest.java`
- Delete: `otw-server/src/test/java/com/gala/otw_server/security/GroupAccessAspectTest.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/common/ErrorCode.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/common/DomainExceptions.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/cache/CacheKeys.java`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ErrorCode` and `DomainExceptions` with all `*_GROUP_*` members removed — Task 2 and Task 4 rely on the resulting (shorter) enum/class not containing any Group-related member.

- [ ] **Step 1: Delete the 15 Group-only files listed above**

```bash
git rm otw-server/src/main/java/com/gala/otw_server/security/auth/RequireGroupRole.java \
       otw-server/src/main/java/com/gala/otw_server/security/auth/GroupRole.java \
       otw-server/src/main/java/com/gala/otw_server/security/auth/GroupAccessAspect.java \
       otw-server/src/main/java/com/gala/otw_server/group/controller/GroupController.java \
       otw-server/src/main/java/com/gala/otw_server/group/service/GroupService.java \
       otw-server/src/main/java/com/gala/otw_server/group/repository/GroupRepository.java \
       otw-server/src/main/java/com/gala/otw_server/group/repository/GroupMemberRepository.java \
       otw-server/src/main/java/com/gala/otw_server/group/entity/Group.java \
       otw-server/src/main/java/com/gala/otw_server/group/entity/GroupMember.java \
       otw-server/src/main/java/com/gala/otw_server/group/dto/GroupDto.java \
       otw-server/src/main/java/com/gala/otw_server/group/dto/GroupMemberDto.java \
       otw-server/src/main/java/com/gala/otw_server/group/dto/CreateGroupRequest.java \
       otw-server/src/main/java/com/gala/otw_server/group/dto/JoinGroupRequest.java \
       otw-server/src/test/java/com/gala/otw_server/group/GroupServiceTest.java \
       otw-server/src/test/java/com/gala/otw_server/security/GroupAccessAspectTest.java
```

- [ ] **Step 2: Remove Group-related codes from `ErrorCode.java`**

Replace the file with:

```java
package com.gala.otw_server.common;

/**
 * Stable, machine-readable error codes returned in every error response body.
 * Format: DOMAIN_DETAIL  (screaming snake case).
 * Clients should switch on these values, not on HTTP status codes alone.
 */
public enum ErrorCode {

    // ── Auth ────────────────────────────────────────────────────────────────
    UNAUTHENTICATED,
    FORBIDDEN,
    TOKEN_EXPIRED,
    TOKEN_INVALID,

    // ── Resource not found ──────────────────────────────────────────────────
    ROOM_NOT_FOUND,
    MEMBER_NOT_FOUND,
    ITINERARY_ITEM_NOT_FOUND,
    CHECKLIST_ITEM_NOT_FOUND,
    EXPENSE_NOT_FOUND,
    PHOTO_NOT_FOUND,

    // ── Access / membership ─────────────────────────────────────────────────
    NOT_A_ROOM_MEMBER,
    INSUFFICIENT_ROOM_ROLE,

    // ── Conflict / state ────────────────────────────────────────────────────
    ALREADY_A_MEMBER,
    DUPLICATE_NICKNAME,          // nickname already taken by an active member of this room
    OPTIMISTIC_LOCK_CONFLICT,   // version mismatch on itinerary/checklist edit
    INVALID_CODE,               // bad room_code on join

    // ── Validation / Limits ────────────────────────────────────────────────
    VALIDATION_ERROR,
    INVALID_REQUEST,
    TOO_MANY_REQUESTS,

    // ── Server ──────────────────────────────────────────────────────────────
    INTERNAL_ERROR,
}
```

- [ ] **Step 3: Remove Group-related exceptions from `DomainExceptions.java` and add `DuplicateNicknameException`**

Replace the file with:

```java
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
```

- [ ] **Step 4: Remove the Group cache-key helpers from `CacheKeys.java`**

Replace the file with:

```java
package com.gala.otw_server.cache;

import java.time.Duration;
import java.util.UUID;

/**
 * Centralized key naming and TTL conventions for Redis cache-aside entries.
 * Defined per OTW Backend Master Plan §6.
 */
public final class CacheKeys {

    private CacheKeys() {}

    // ── TTLs ─────────────────────────────────────────────────────────────────
    public static final Duration TTL_MEMBERSHIP = Duration.ofMinutes(5);
    public static final Duration TTL_OVERVIEW = Duration.ofSeconds(60);
    public static final Duration TTL_COLLECTIONS = Duration.ofSeconds(30);

    // ── Room Keys ────────────────────────────────────────────────────────────
    public static String roomMember(UUID roomId, UUID userId) {
        return "room:" + roomId + ":member:" + userId;
    }

    public static String roomOverview(UUID roomId) {
        return "room:" + roomId + ":overview";
    }

    public static String roomItinerary(UUID roomId) {
        return "room:" + roomId + ":itinerary";
    }

    public static String roomChecklist(UUID roomId) {
        return "room:" + roomId + ":checklist";
    }

    public static String roomSettlement(UUID roomId) {
        return "room:" + roomId + ":settlement";
    }

    public static String roomLocations(UUID roomId) {
        return "room:" + roomId + ":locations";
    }
}
```

- [ ] **Step 5: Confirm the build still fails (expected) because Room/RoomController/RoomService still reference `Group`**

Run: `cd otw-server && mvn -q compile`
Expected: FAIL — `cannot find symbol: class Group` in `Room.java`, `RoomDto.java`, `RoomRepository.java`, `RoomController.java`, `RoomService.java`, `RoomServiceTest.java`. This confirms Step 1's deletions took effect; Task 2 fixes these.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Group authorization primitives and feature package"
```

---

### Task 2: Decouple Room from Group

**Files:**
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/entity/Room.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/dto/RoomDto.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/dto/CreateRoomRequest.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/repository/RoomRepository.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/controller/RoomController.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/room/service/RoomService.java`
- Modify: `otw-server/src/test/java/com/gala/otw_server/room/RoomServiceTest.java`

**Interfaces:**
- Consumes: `ErrorCode`/`DomainExceptions` from Task 1 (no Group members).
- Produces: `RoomService(RoomRepository, RoomMemberRepository, RealtimeEventPublisher, CacheService)` — a 4-arg constructor (was 5-arg with `GroupRepository`). `RoomDto` with no `groupId` field. `POST /api/v1/rooms` and `POST /api/v1/rooms/join` as the *only* room-creation/join endpoints — `/api/v1/groups/{groupId}/rooms` no longer exists. Task 4 calls `roomService.joinRoom(...)` and depends on this exact signature being unchanged from before this task.

- [ ] **Step 1: Update `Room.java` to drop the `group` relationship**

```java
package com.gala.otw_server.room.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a single gala or trip event (a "Room").
 * Rooms are always standalone — there is no persistent group/barkada tier.
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_code", unique = true, nullable = false, length = 8)
    private String roomCode;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "schedule_at")
    private OffsetDateTime scheduleAt;

    @Column(name = "meeting_lat")
    private Double meetingLat;

    @Column(name = "meeting_lng")
    private Double meetingLng;

    @Column(name = "meeting_label", length = 255)
    private String meetingLabel;

    @Column(name = "host_user_id", nullable = false)
    private UUID hostUserId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onPreUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
```

- [ ] **Step 2: Update `RoomDto.java` to drop `groupId`**

```java
package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.Room;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a Room.
 */
public record RoomDto(
        UUID id,
        String roomCode,
        String title,
        OffsetDateTime scheduleAt,
        Double meetingLat,
        Double meetingLng,
        String meetingLabel,
        UUID hostUserId,
        String status,
        OffsetDateTime createdAt
) {
    public static RoomDto from(Room r) {
        return new RoomDto(
                r.getId(),
                r.getRoomCode(),
                r.getTitle(),
                r.getScheduleAt(),
                r.getMeetingLat(),
                r.getMeetingLng(),
                r.getMeetingLabel(),
                r.getHostUserId(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
```

- [ ] **Step 3: Update the `CreateRoomRequest.java` javadoc (fields are unchanged)**

```java
package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code POST /rooms} — every room is standalone.
 */
public record CreateRoomRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname,

        OffsetDateTime scheduleAt,

        Double meetingLat,
        Double meetingLng,

        @Size(max = 255, message = "Meeting label must be at most 255 characters")
        String meetingLabel
) {}
```

- [ ] **Step 4: Update `RoomRepository.java` to drop `findActiveRoomsByGroup`**

```java
package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByRoomCodeAndStatus(String roomCode, String status);

    boolean existsByRoomCode(String roomCode);
}
```

- [ ] **Step 5: Update `RoomController.java` to drop the two group-scoped endpoints**

```java
package com.gala.otw_server.room.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.service.RoomService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class RoomController {

    private final RoomService roomService;
    private final CurrentUserProvider currentUser;

    public RoomController(RoomService roomService, CurrentUserProvider currentUser) {
        this.roomService = roomService;
        this.currentUser = currentUser;
    }

    // ── POST /rooms — create a room ───────────────────────────────────────────

    @PostMapping("/api/v1/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomDto createRoom(@Valid @RequestBody CreateRoomRequest req) {
        return roomService.createRoom(currentUser.getUserId(), req);
    }

    // ── POST /rooms/join — join by code ───────────────────────────────────────

    @PostMapping("/api/v1/rooms/join")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomMemberDto joinRoom(@Valid @RequestBody JoinRoomRequest req) {
        return roomService.joinRoom(currentUser.getUserId(), req);
    }

    // ── GET /rooms/{roomId} — room overview ───────────────────────────────────

    @GetMapping("/api/v1/rooms/{roomId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomDto getRoom(@PathVariable UUID roomId) {
        return roomService.getRoom(roomId);
    }

    // ── GET /rooms/{roomId}/members — member list ─────────────────────────────

    @GetMapping("/api/v1/rooms/{roomId}/members")
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<RoomMemberDto> getMembers(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return roomService.getMembers(roomId, cursor, Math.min(limit, 50));
    }

    // ── DELETE /rooms/{roomId}/members/{userId} — remove member (host only) ──

    @DeleteMapping("/api/v1/rooms/{roomId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.HOST)
    public void removeMember(
            @PathVariable UUID roomId,
            @PathVariable UUID userId) {
        roomService.removeMember(roomId, userId);
    }

    // ── PATCH /rooms/{roomId}/members/me/rsvp — update own RSVP ─────────────

    @PatchMapping("/api/v1/rooms/{roomId}/members/me/rsvp")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomMemberDto updateRsvp(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateRsvpRequest req) {
        return roomService.updateRsvp(roomId, currentUser.getUserId(), req);
    }
}
```

- [ ] **Step 6: Update `RoomService.java` to drop `GroupRepository`, `createGroupRoom`, and `getRoomsInGroup`**

```java
package com.gala.otw_server.room.service;

import com.gala.otw_server.common.CodeGenerator;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);
    private static final int MAX_CODE_ATTEMPTS = 5;

    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final com.gala.otw_server.cache.CacheService cacheService;

    public RoomService(RoomRepository roomRepo,
                       RoomMemberRepository memberRepo,
                       RealtimeEventPublisher realtime,
                       com.gala.otw_server.cache.CacheService cacheService) {
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.cacheService = cacheService;
    }

    // ── Create room ───────────────────────────────────────────────────────────

    public RoomDto createRoom(UUID callerId, CreateRoomRequest req) {
        Room room = new Room();
        room.setRoomCode(generateUniqueCode());
        room.setTitle(req.title());
        room.setScheduleAt(req.scheduleAt());
        room.setMeetingLat(req.meetingLat());
        room.setMeetingLng(req.meetingLng());
        room.setMeetingLabel(req.meetingLabel());
        room.setHostUserId(callerId);
        room = roomRepo.save(room);

        RoomMember host = new RoomMember();
        host.setRoom(room);
        host.setUserId(callerId);
        host.setNickname(req.nickname());
        host.setRole(RoomRole.HOST);
        memberRepo.save(host);

        log.info("Room created: id={}, code={}, host={}", room.getId(), room.getRoomCode(), callerId);
        return RoomDto.from(room);
    }

    // ── Join room by code ─────────────────────────────────────────────────────

    public RoomMemberDto joinRoom(UUID callerId, JoinRoomRequest req) {
        Room room = roomRepo.findByRoomCodeAndStatus(req.roomCode().toUpperCase(), "ACTIVE")
                .orElseThrow(InvalidCodeException::new);

        if (memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(room.getId(), callerId)) {
            throw new AlreadyAMemberException();
        }

        if (memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(room.getId(), req.nickname())) {
            throw new DuplicateNicknameException();
        }

        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUserId(callerId);
        member.setNickname(req.nickname());
        member.setRole(RoomRole.MEMBER);

        try {
            member = memberRepo.save(member);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Belt-and-suspenders: two concurrent joins raced past the check above.
            throw new DuplicateNicknameException();
        }

        final UUID roomId = room.getId();
        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.joined",
                Map.of("userId", callerId, "nickname", req.nickname()));

        log.info("User {} joined room {}", callerId, roomId);
        return dto;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RoomDto getRoom(UUID roomId) {
        return RoomDto.from(findActiveRoomOrThrow(roomId));
    }

    @Transactional(readOnly = true)
    public PageResponse<RoomMemberDto> getMembers(UUID roomId, UUID cursor, int limit) {
        List<RoomMember> members = memberRepo.findActiveMembers(
                roomId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = members.size() > limit;
        List<RoomMemberDto> page = members.stream()
                .limit(limit)
                .map(RoomMemberDto::from)
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).id().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Remove member ─────────────────────────────────────────────────────────

    public void removeMember(UUID roomId, UUID targetUserId) {
        RoomMember member = memberRepo
                .findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, targetUserId)
                .orElseThrow(MemberNotFoundException::new);

        if (member.getRole() == RoomRole.HOST) {
            throw new ForbiddenException("Cannot remove the host from the room");
        }

        member.setLeftAt(OffsetDateTime.now());
        memberRepo.save(member);

        cacheService.evictAfterCommit(com.gala.otw_server.cache.CacheKeys.roomMember(roomId, targetUserId));

        publishAfterCommit(roomId, "member.left",
                Map.of("userId", targetUserId));
    }

    // ── RSVP update ───────────────────────────────────────────────────────────

    public RoomMemberDto updateRsvp(UUID roomId, UUID callerId, UpdateRsvpRequest req) {
        RoomMember member = memberRepo
                .findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .orElseThrow(NotARoomMemberException::new);

        member.setRsvpStatus(req.rsvpStatus());
        member = memberRepo.save(member);

        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.rsvp.changed",
                Map.of("userId", callerId, "status", req.rsvpStatus()));

        return dto;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Room findActiveRoomOrThrow(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (!"ACTIVE".equals(room.getStatus())) throw new RoomNotFoundException();
        return room;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = CodeGenerator.generate();
            if (!roomRepo.existsByRoomCode(code)) return code;
        }
        throw new IllegalStateException("Failed to generate a unique room code after " + MAX_CODE_ATTEMPTS + " attempts");
    }

    /**
     * Publishes a realtime event after the DB transaction commits.
     * This guarantees clients never receive an event for a write that rolled back.
     */
    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, event, payload);
                }
            });
        } else {
            realtime.publish(roomId, event, payload);
        }
    }
}
```

Note: this step already wires in the `existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull` call and the `DataIntegrityViolationException` catch that Task 4's DB index formally backstops — `RoomMemberRepository` doesn't declare that method yet, so the project will not compile until Step 8 below adds it (same task, next step).

- [ ] **Step 7: Update `RoomServiceTest.java` — drop the `GroupRepository` mock, `groupId` field, and `createGroupRoom_success` test**

```java
package com.gala.otw_server.room;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomService;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private CacheService cacheService;

    private RoomService roomService;

    private final UUID callerId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepo, memberRepo, realtime, cacheService);
    }

    @Test
    @DisplayName("createRoom creates a room and assigns the creator as HOST member")
    void createRoom_success() {
        CreateRoomRequest req = new CreateRoomRequest(
                "Beach Gala",
                "Melvin",
                OffsetDateTime.now().plusDays(7),
                14.5995,
                120.9842,
                "Manila Bay"
        );

        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId(roomId);
            r.setStatus("ACTIVE");
            return r;
        });

        RoomDto result = roomService.createRoom(callerId, req);

        assertThat(result.id()).isEqualTo(roomId);
        assertThat(result.title()).isEqualTo("Beach Gala");
        assertThat(result.roomCode()).isNotNull();

        verify(memberRepo).save(argThat(member ->
                member.getRole() == RoomRole.HOST &&
                member.getUserId().equals(callerId) &&
                "Melvin".equals(member.getNickname())
        ));
    }

    @Test
    @DisplayName("joinRoom joins room, creates MEMBER, and publishes realtime event")
    void joinRoom_success() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos");
        Room room = new Room();
        room.setId(roomId);
        room.setRoomCode("ROOM1234");
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Carlos")).thenReturn(false);
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> {
            RoomMember m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setJoinedAt(OffsetDateTime.now());
            return m;
        });

        RoomMemberDto result = roomService.joinRoom(callerId, req);

        assertThat(result.userId()).isEqualTo(callerId);
        assertThat(result.role()).isEqualTo(RoomRole.MEMBER);
        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.PENDING);

        verify(realtime).publish(eq(roomId), eq("member.joined"), any());
    }

    @Test
    @DisplayName("joinRoom throws AlreadyAMemberException when user is active member")
    void joinRoom_alreadyMember() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(AlreadyAMemberException.class);
    }

    @Test
    @DisplayName("joinRoom throws DuplicateNicknameException when nickname is taken by an active member")
    void joinRoom_duplicateNickname() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(DuplicateNicknameException.class);

        verify(memberRepo, never()).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("joinRoom maps a raced DB unique-constraint violation to DuplicateNicknameException")
    void joinRoom_duplicateNickname_concurrentRace() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        // Pre-check passes (no active "Miguel" yet)...
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(false);
        // ...but a concurrent request beats this one to the insert.
        when(memberRepo.save(any(RoomMember.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(DuplicateNicknameException.class);
    }

    @Test
    @DisplayName("updateRsvp updates status and publishes realtime event")
    void updateRsvp_success() {
        UpdateRsvpRequest req = new UpdateRsvpRequest(RsvpStatus.GOING);
        RoomMember member = new RoomMember();
        member.setId(UUID.randomUUID());
        member.setUserId(callerId);
        member.setRole(RoomRole.MEMBER);
        member.setRsvpStatus(RsvpStatus.PENDING);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(member));
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomMemberDto result = roomService.updateRsvp(roomId, callerId, req);

        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.GOING);
        verify(realtime).publish(eq(roomId), eq("member.rsvp.changed"), any());
    }

    @Test
    @DisplayName("removeMember marks leftAt, evicts cache, and publishes event")
    void removeMember_success() {
        UUID targetUserId = UUID.randomUUID();
        RoomMember member = new RoomMember();
        member.setId(UUID.randomUUID());
        member.setUserId(targetUserId);
        member.setRole(RoomRole.MEMBER);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, targetUserId)).thenReturn(Optional.of(member));

        roomService.removeMember(roomId, targetUserId);

        assertThat(member.getLeftAt()).isNotNull();
        verify(memberRepo).save(member);
        verify(cacheService).evictAfterCommit(eq("room:" + roomId + ":member:" + targetUserId));
        verify(realtime).publish(eq(roomId), eq("member.left"), any());
    }

    @Test
    @DisplayName("removeMember throws ForbiddenException when removing HOST")
    void removeMember_cannotRemoveHost() {
        UUID hostId = UUID.randomUUID();
        RoomMember host = new RoomMember();
        host.setId(UUID.randomUUID());
        host.setUserId(hostId);
        host.setRole(RoomRole.HOST);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, hostId)).thenReturn(Optional.of(host));

        assertThatThrownBy(() -> roomService.removeMember(roomId, hostId))
                .isInstanceOf(ForbiddenException.class);
    }
}
```

(This file will still fail to compile until Step 8 below adds `existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull` to `RoomMemberRepository` — continue to Step 8 before attempting to run this test suite.)

- [ ] **Step 8: Add the missing repository method now, so Task 2/3 can compile and run before Task 4's own TDD cycle**

Modify `otw-server/src/main/java/com/gala/otw_server/room/repository/RoomMemberRepository.java`:

```java
package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.RoomMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {

    Optional<RoomMember> findByRoom_IdAndUserIdAndLeftAtIsNull(UUID roomId, UUID userId);

    boolean existsByRoom_IdAndUserIdAndLeftAtIsNull(UUID roomId, UUID userId);

    boolean existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(UUID roomId, String nickname);

    List<RoomMember> findByRoom_IdAndLeftAtIsNull(UUID roomId);

    /** Paginated member list for a room. */
    @Query("""
            SELECT m FROM RoomMember m
            WHERE m.room.id = :roomId
              AND m.leftAt IS NULL
              AND (:cursor IS NULL OR m.id > :cursor)
            ORDER BY m.joinedAt ASC, m.id ASC
            """)
    List<RoomMember> findActiveMembers(
            @Param("roomId") UUID roomId,
            @Param("cursor") UUID cursor,
            Pageable pageable);
}
```

This is the same method Task 4 documents and tests in depth (Task 4 owns the DB-level enforcement via the partial unique index); adding the Spring Data derived-query signature here is what makes Task 2's and Task 4's code compile together in one pass.

- [ ] **Step 9: Compile and run the full test suite**

Run: `cd otw-server && mvn -q test`
Expected: PASS for every test *except* any test still asserting on the now-removed `groupId`/group endpoints (there should be none left after Step 7).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: decouple Room from the removed Group tier"
```

---

### Task 3: Drop the `groups`/`group_members` tables and `rooms.group_id`

**Files:**
- Create: `otw-server/src/main/resources/db/migration/V4__Remove_Group_Tier.sql`
- Test: `otw-server/src/test/java/com/gala/otw_server/OtwServerApplicationTests.java` (existing — run as verification, not modified)

**Interfaces:**
- Consumes: nothing from Java code (pure schema migration).
- Produces: a `rooms` table with no `group_id` column and no `groups`/`group_members` tables — Task 4's migration (`V5`) assumes `group_id` is already gone and only touches `room_members`.

- [ ] **Step 1: Confirm the baseline passes before this migration exists**

Run: `cd otw-server && mvn -q test -Dtest=OtwServerApplicationTests`
Expected: PASS (Testcontainers boots Postgres, Flyway runs `V1`–`V3`, Spring context loads — `Room`/`RoomMember` no longer reference `Group` after Task 2, so `ddl-auto=validate` has nothing group-related left to check).

- [ ] **Step 2: Write the migration**

```sql
-- ==============================================================================
-- V4: Remove the Group tier — OTW is now a flat, standalone-room-only model.
-- Dropping rooms.group_id first releases the FK to groups(id); group_members
-- is dropped before groups since it also references groups(id).
-- ==============================================================================

ALTER TABLE rooms DROP COLUMN IF EXISTS group_id;

DROP TABLE IF EXISTS group_members;

DROP TABLE IF EXISTS groups;
```

- [ ] **Step 3: Run the full test suite to confirm the app still boots with the new schema**

Run: `cd otw-server && mvn -q test`
Expected: PASS. `OtwServerApplicationTests` re-runs Flyway against a fresh Testcontainers Postgres instance, applying `V1`→`V4` in order; since no entity maps `groups`/`group_members`/`rooms.group_id` anymore (Task 2), `ddl-auto=validate` has nothing to complain about.

- [ ] **Step 4: Commit**

```bash
git add otw-server/src/main/resources/db/migration/V4__Remove_Group_Tier.sql
git commit -m "feat: drop groups/group_members tables and rooms.group_id column"
```

---

### Task 4: Enforce per-room nickname uniqueness (D3-04)

**Files:**
- Create: `otw-server/src/main/resources/db/migration/V5__Add_Room_Member_Nickname_Uniqueness.sql`
- Create: `otw-server/src/test/java/com/gala/otw_server/room/RoomMemberRepositoryTest.java`
- Test: `otw-server/src/test/java/com/gala/otw_server/room/RoomServiceTest.java` (already updated by Task 2 Step 7 — those tests exercise the *service-level* check; this task's new repository test exercises the *DB-level* semantics a pure Mockito test can't distinguish — see Step 3 below)

**Interfaces:**
- Consumes: `RoomMemberRepository.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(UUID, String)` (added in Task 2 Step 8), `DomainExceptions.DuplicateNicknameException` (added in Task 1 Step 3).
- Produces: a partial unique index on `room_members` that makes nickname collisions impossible at the DB layer even if application code is ever bypassed (e.g. a future direct-SQL admin tool).

- [ ] **Step 1: Confirm Task 2's three nickname tests already pass (they were written in Task 2, ahead of the DB backstop — this is the acceptable order because the application-level check is what those tests exercise)**

Run: `cd otw-server && mvn -q test -Dtest=RoomServiceTest`
Expected: PASS — `joinRoom_duplicateNickname`, `joinRoom_duplicateNickname_concurrentRace`, and `joinRoom_success` (with the new `existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull` stub) all pass, because Task 2 already wired `RoomService.joinRoom` to call the repository check and to catch `DataIntegrityViolationException`.

- [ ] **Step 2: Add the DB-level partial unique index**

```sql
-- ==============================================================================
-- V5: Enforce nickname uniqueness per room at the database layer.
-- Case-insensitive ("Miguel" and "miguel" collide) and scoped to active
-- members only (left_at IS NULL) — a member who left frees their nickname
-- for reuse, matching room_members' existing left_at-scoped uniqueness pattern.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_room_nickname_active
    ON room_members (room_id, LOWER(nickname))
    WHERE left_at IS NULL;
```

- [ ] **Step 3: Write a repository-level test proving the DB index's exact semantics — a Mockito service test can't tell "nickname never used" apart from "nickname freed by a leaver," since both just make the mocked repository method return `false`. This needs a real database.**

Create `otw-server/src/test/java/com/gala/otw_server/room/RoomMemberRepositoryTest.java`:

```java
package com.gala.otw_server.room;

import com.gala.otw_server.TestcontainersConfiguration;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class RoomMemberRepositoryTest {

    @Autowired
    private RoomMemberRepository memberRepo;

    @Autowired
    private RoomRepository roomRepo;

    private Room persistRoom() {
        Room room = new Room();
        room.setRoomCode("R" + UUID.randomUUID().toString().substring(0, 7).toUpperCase());
        room.setTitle("Test Gala");
        room.setHostUserId(UUID.randomUUID());
        return roomRepo.saveAndFlush(room);
    }

    private RoomMember member(Room room, String nickname) {
        RoomMember m = new RoomMember();
        m.setRoom(room);
        m.setUserId(UUID.randomUUID());
        m.setNickname(nickname);
        m.setRole(RoomRole.MEMBER);
        return m;
    }

    @Test
    void secondActiveMemberWithSameNicknameCaseInsensitive_violatesUniqueIndex() {
        Room room = persistRoom();
        memberRepo.saveAndFlush(member(room, "Miguel"));

        assertThatThrownBy(() -> memberRepo.saveAndFlush(member(room, "miguel")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void nicknameFreedByALeftMember_canBeReusedByANewActiveMember() {
        Room room = persistRoom();
        RoomMember left = member(room, "Miguel");
        left.setLeftAt(OffsetDateTime.now());
        memberRepo.saveAndFlush(left);

        RoomMember rejoined = memberRepo.saveAndFlush(member(room, "Miguel"));

        assertThat(rejoined.getId()).isNotNull();
    }
}
```

Run: `cd otw-server && mvn -q test -Dtest=RoomMemberRepositoryTest`
Expected: PASS on both methods — the first proves the `V5` index actually rejects a case-insensitive collision between two active members; the second proves a departed member's nickname is genuinely free for reuse, not just "free because the mock said so."

- [ ] **Step 4: Run the full test suite once more against the real Testcontainers Postgres, confirming the new index doesn't break any existing join flow**

Run: `cd otw-server && mvn -q test`
Expected: PASS. In particular `RoomServiceTest#joinRoom_success` still passes — it joins a single member with a nickname that doesn't collide with anything, so the new index never rejects it.

- [ ] **Step 5: Commit**

```bash
git add otw-server/src/main/resources/db/migration/V5__Add_Room_Member_Nickname_Uniqueness.sql \
        otw-server/src/test/java/com/gala/otw_server/room/RoomMemberRepositoryTest.java
git commit -m "feat: enforce per-room nickname uniqueness (case-insensitive, active members only)"
```

---

### Task 5: Update the authoritative docs to match the new architecture

**Files:**
- Modify: `docs/OTW_Backend_Master_Plan.md` (remove/annotate the Group sections — §3 groups table, §5.2/§5.3 group authorization, §1 `group` package)
- Modify: `docs/vault/Schema.md`
- Modify: `docs/vault/Structure.md`
- Modify: `docs/vault/Auth.md`
- Modify: `docs/vault/API.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: docs that no longer describe a `group`/`group_members` tier as authoritative, so a future reader of `AGENTS.md`'s "CORE DATA MODEL RULES" isn't told to enforce a two-tier model the code no longer has.

- [ ] **Step 1: Edit `docs/vault/Schema.md`** — remove the `## Model` paragraph's Group description and the `groups`/`group_members` table rows; remove `rooms.group_id` from the `rooms` row; remove the two group-related index bullets. Add one line under the table: `> Group/barkada tier removed 2026-09-29 — see docs/OTW - WEB.pdf's flat Room-only model. This drift from the original master plan §3 is intentional; the master plan itself is being amended in the same change.`

- [ ] **Step 2: Edit `docs/vault/Structure.md`** — remove `group` from the "Feature packages" bullet list; remove `security/authz/` `@RequireGroupRole` mention (keep `@RequireRoomRole`); correct the stale `com.otw` root package name to `com.gala.otw_server` (already inconsistent with the actual codebase, noticed during this change — fix opportunistically since this line is being edited anyway, not as new unrelated scope).

- [ ] **Step 3: Edit `docs/vault/Auth.md`** — remove the "Group-scoped endpoints" paragraph and the `@RequireGroupRole(GroupRole.X)` bullet under Implementation; remove the "Group OWNER/ADMIN gets no elevated rights..." line (no longer applicable, there is no Group); **replace** the line "Anonymous Supabase users are real users with a real `sub`; treat them the same as email users..." with: `- Anonymous Supabase sessions are rejected. NotAnonymousJwtValidator fails any token with is_anonymous=true or a blank email → 401 {"code":"ACCOUNT_REQUIRED"}. Every non-public endpoint requires a registered account.`

- [ ] **Step 4: Edit `docs/vault/API.md`** — remove the `POST /groups`, `POST /groups/join`, `GET /groups/{groupId}`, `GET /groups/{groupId}/members`, `DELETE /groups/{groupId}/members/{userId}`, `GET /groups/{groupId}/rooms`, and `POST /groups/{groupId}/rooms` rows from the endpoint table.

- [ ] **Step 5: Edit `docs/OTW_Backend_Master_Plan.md`** — read the current §1 (packages), §3 (schema), §5.2/§5.3 (authorization) sections and apply the equivalent removals so the master plan and the vault notes agree; in §5.1, replace any statement that anonymous users are accepted with the rejection rule from Step 3; add a dated changelog line at the top of the file: `2026-09-29: Group/barkada tier removed — see docs/OTW - WEB.pdf's flat Room-only tasking. Backend now has one authorization tier (Room), not two. Anonymous Supabase sessions are rejected; a registered account is required (overrides the PDF's no-login flow).`

- [ ] **Step 6: Commit**

```bash
git add docs/OTW_Backend_Master_Plan.md docs/vault/Schema.md docs/vault/Structure.md docs/vault/Auth.md docs/vault/API.md
git commit -m "docs: update master plan and vault notes for the Group-tier removal"
```

---

### Task 6: Require a registered account — reject anonymous Supabase sessions

**Files:**
- Create: `otw-server/src/main/java/com/gala/otw_server/security/NotAnonymousJwtValidator.java`
- Create: `otw-server/src/test/java/com/gala/otw_server/security/NotAnonymousJwtValidatorTest.java`
- Modify: `otw-server/src/main/java/com/gala/otw_server/config/SecurityConfig.java` (validator chain at lines 122–135; entry point at lines 87–92)
- Modify: `otw-server/src/main/java/com/gala/otw_server/common/ErrorCode.java`

**Interfaces:**
- Consumes: `ErrorCode` as left by Task 1 (independent of Tasks 2–5 otherwise; can run in any order after Task 1).
- Produces: `NotAnonymousJwtValidator implements OAuth2TokenValidator<Jwt>` with `public static final String ERROR_CODE = "anonymous_not_allowed"` and `public static boolean isCauseOf(Throwable ex)`. `ErrorCode.ACCOUNT_REQUIRED` — the frontend switches on this to redirect to sign-in.

- [ ] **Step 1: Write the failing test**

Create `otw-server/src/test/java/com/gala/otw_server/security/NotAnonymousJwtValidatorTest.java`:

```java
package com.gala.otw_server.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class NotAnonymousJwtValidatorTest {

    private final NotAnonymousJwtValidator validator = new NotAnonymousJwtValidator();

    private Jwt jwt(Boolean isAnonymous, String email) {
        Jwt.Builder b = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject(UUID.randomUUID().toString());
        if (isAnonymous != null) b.claim("is_anonymous", isAnonymous);
        if (email != null) b.claim("email", email);
        return b.build();
    }

    @Test
    @DisplayName("anonymous session token is rejected")
    void anonymousToken_isRejected() {
        OAuth2TokenValidatorResult result = validator.validate(jwt(true, ""));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors())
                .extracting(OAuth2Error::getErrorCode)
                .containsExactly(NotAnonymousJwtValidator.ERROR_CODE);
    }

    @Test
    @DisplayName("token with no is_anonymous claim and no email is rejected (fail-closed)")
    void missingClaimAndNoEmail_isRejected() {
        assertThat(validator.validate(jwt(null, null)).hasErrors()).isTrue();
    }

    @Test
    @DisplayName("registered email account token is accepted")
    void registeredToken_isAccepted() {
        assertThat(validator.validate(jwt(false, "melvin@example.com")).hasErrors()).isFalse();
    }

    @Test
    @DisplayName("isCauseOf recognises our rejection inside Spring's bearer-token exception")
    void isCauseOf_detectsAnonymousRejection() {
        OAuth2Error ours = new OAuth2Error(NotAnonymousJwtValidator.ERROR_CODE);
        Exception wrapped = new InvalidBearerTokenException("invalid",
                new JwtValidationException("invalid", List.of(ours)));

        assertThat(NotAnonymousJwtValidator.isCauseOf(wrapped)).isTrue();
    }

    @Test
    @DisplayName("isCauseOf ignores unrelated token failures (e.g. expired)")
    void isCauseOf_ignoresOtherFailures() {
        OAuth2Error expired = new OAuth2Error("invalid_token", "Jwt expired", null);
        Exception wrapped = new InvalidBearerTokenException("invalid",
                new JwtValidationException("invalid", List.of(expired)));

        assertThat(NotAnonymousJwtValidator.isCauseOf(wrapped)).isFalse();
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd otw-server && mvn -q test -Dtest=NotAnonymousJwtValidatorTest`
Expected: FAIL — compilation error, `cannot find symbol: class NotAnonymousJwtValidator`.

- [ ] **Step 3: Write the validator**

Create `otw-server/src/main/java/com/gala/otw_server/security/NotAnonymousJwtValidator.java`:

```java
package com.gala.otw_server.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;

/**
 * Rejects Supabase anonymous sessions: OTW requires a registered account.
 * Fail-closed — a missing is_anonymous claim still needs a non-blank email,
 * since every supported login method (email/OTP, password) is email-based.
 */
public class NotAnonymousJwtValidator implements OAuth2TokenValidator<Jwt> {

    public static final String ERROR_CODE = "anonymous_not_allowed";

    private static final OAuth2Error ERROR =
            new OAuth2Error(ERROR_CODE, "A registered account is required", null);

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        boolean anonymous = Boolean.TRUE.equals(jwt.getClaim("is_anonymous"));
        String email = jwt.getClaimAsString("email");
        if (anonymous || email == null || email.isBlank()) {
            return OAuth2TokenValidatorResult.failure(ERROR);
        }
        return OAuth2TokenValidatorResult.success();
    }

    /** True if an authentication failure was caused by this validator's rejection. */
    public static boolean isCauseOf(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof JwtValidationException jve) {
                return jve.getErrors().stream()
                        .anyMatch(e -> ERROR_CODE.equals(e.getErrorCode()));
            }
        }
        return false;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd otw-server && mvn -q test -Dtest=NotAnonymousJwtValidatorTest`
Expected: PASS (5 tests).

- [ ] **Step 5: Add `ACCOUNT_REQUIRED` to `ErrorCode.java`** — in the `// ── Auth ──` section, after `TOKEN_INVALID,` add:

```java
    ACCOUNT_REQUIRED,           // valid token, but an anonymous session — sign in with an account
```

- [ ] **Step 6: Wire the validator and the distinct error into `SecurityConfig.java`**

Replace the `.authenticationEntryPoint(...)` lambda (lines 87–92) with:

```java
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(),
                                    NotAnonymousJwtValidator.isCauseOf(authException)
                                            ? ErrorResponse.of(ErrorCode.ACCOUNT_REQUIRED,
                                                    "Please sign in with an account to use OTW")
                                            : ErrorResponse.of(ErrorCode.UNAUTHENTICATED,
                                                    "Invalid or missing token"));
                        })
```

Replace line 135:

```java
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience));
```

with:

```java
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                withIssuer, withAudience, new NotAnonymousJwtValidator()));
```

and add the import `import com.gala.otw_server.security.NotAnonymousJwtValidator;` alongside the existing `SupabaseJwtAuthenticationConverter` import.

- [ ] **Step 7: Run the full suite — `SecurityFilterTest` must still pass unchanged (no token / garbage token still → `UNAUTHENTICATED`, public ping still 200)**

Run: `cd otw-server && mvn -q test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add otw-server/src/main/java/com/gala/otw_server/security/NotAnonymousJwtValidator.java \
        otw-server/src/test/java/com/gala/otw_server/security/NotAnonymousJwtValidatorTest.java \
        otw-server/src/main/java/com/gala/otw_server/config/SecurityConfig.java \
        otw-server/src/main/java/com/gala/otw_server/common/ErrorCode.java
git commit -m "feat: require a registered account by rejecting anonymous Supabase sessions"
```

---

## Explicitly Out of Scope (flag, don't invent)

- **Gala-code expiry/lifecycle** (PDF ticket D2-08: "Team decides: auto-expire N days after gala date, or manual close by leader"). This is an explicit product decision the source document defers to the team — this plan does not implement any expiry logic. Decide it, then it's a follow-up plan.
- **Response envelope shape** (PDF ticket D1-02 specifies `{ data, error, meta }`; the existing codebase already ships a documented `{ code, message }` `ErrorResponse`/`ErrorCode` envelope used by all nine feature packages). Changing this would touch every controller across the whole backend for a cosmetic wire-format difference with no functional requirement behind it — out of scope for a targeted Group-removal plan. Flagging so it isn't silently decided either way.
- **PDF ticket D2-01 (silent anonymous session) is dropped** by product-owner decision — Task 6 makes the backend reject those tokens. The sign-up / sign-in screens are frontend work. Two Supabase **dashboard** settings (not code, owned by whoever administers the Supabase project) should match: turn **off** "Allow anonymous sign-ins" and turn **on** "Confirm email", so unverified addresses can't obtain a token in the first place. The backend check stays as defense in depth either way.
- Every other feature package (`itinerary`, `checklist`, `budget`, `expense`, `location`, `photo`, `rsvp`) has no Group coupling and is untouched by this plan.
