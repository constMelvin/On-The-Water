package com.gala.otw_server.group.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.group.dto.*;
import com.gala.otw_server.group.service.GroupService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.GroupRole;
import com.gala.otw_server.security.auth.RequireGroupRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;
    private final CurrentUserProvider currentUser;

    public GroupController(GroupService groupService, CurrentUserProvider currentUser) {
        this.groupService = groupService;
        this.currentUser = currentUser;
    }

    // ── POST /groups — create group ──────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupDto createGroup(@Valid @RequestBody CreateGroupRequest req) {
        return groupService.createGroup(currentUser.getUserId(), req);
    }

    // ── POST /groups/join — join by code ─────────────────────────────────────

    @PostMapping("/join")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupMemberDto joinGroup(@Valid @RequestBody JoinGroupRequest req) {
        return groupService.joinGroup(currentUser.getUserId(), req);
    }

    // ── GET /groups/{groupId} — overview ─────────────────────────────────────

    @GetMapping("/{groupId}")
    @RequireGroupRole(GroupRole.MEMBER)
    public GroupDto getGroup(@PathVariable UUID groupId) {
        return groupService.getGroup(groupId);
    }

    // ── GET /groups/{groupId}/members — paginated roster ────────────────────

    @GetMapping("/{groupId}/members")
    @RequireGroupRole(GroupRole.MEMBER)
    public PageResponse<GroupMemberDto> getMembers(
            @PathVariable UUID groupId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return groupService.getMembers(groupId, cursor, Math.min(limit, 50));
    }

    // ── DELETE /groups/{groupId}/members/{userId} — remove member ───────────

    @DeleteMapping("/{groupId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireGroupRole(GroupRole.ADMIN)
    public void removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId) {
        groupService.removeMember(groupId, userId);
    }
}
