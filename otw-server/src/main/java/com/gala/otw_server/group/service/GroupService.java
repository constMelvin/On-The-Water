package com.gala.otw_server.group.service;

import com.gala.otw_server.common.CodeGenerator;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.group.dto.*;
import com.gala.otw_server.group.entity.Group;
import com.gala.otw_server.group.entity.GroupMember;
import com.gala.otw_server.group.repository.GroupMemberRepository;
import com.gala.otw_server.group.repository.GroupRepository;
import com.gala.otw_server.security.auth.GroupRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class GroupService {

    private static final Logger log = LoggerFactory.getLogger(GroupService.class);
    private static final int MAX_CODE_ATTEMPTS = 5;

    private final GroupRepository groupRepo;
    private final GroupMemberRepository memberRepo;
    private final com.gala.otw_server.cache.CacheService cacheService;

    public GroupService(GroupRepository groupRepo,
                        GroupMemberRepository memberRepo,
                        com.gala.otw_server.cache.CacheService cacheService) {
        this.groupRepo = groupRepo;
        this.memberRepo = memberRepo;
        this.cacheService = cacheService;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Creates a new group and makes the caller the OWNER.
     */
    public GroupDto createGroup(UUID callerId, CreateGroupRequest req) {
        Group group = new Group();
        group.setGroupCode(generateUniqueCode());
        group.setName(req.name());
        group.setCreatedBy(callerId);

        group = groupRepo.save(group);

        GroupMember owner = new GroupMember();
        owner.setGroup(group);
        owner.setUserId(callerId);
        owner.setNickname(req.nickname());
        owner.setRole(GroupRole.OWNER);
        memberRepo.save(owner);

        log.info("Group created: id={}, code={}, owner={}", group.getId(), group.getGroupCode(), callerId);
        return GroupDto.from(group);
    }

    // ── Join ──────────────────────────────────────────────────────────────────

    /**
     * Joins an existing group by its code. The caller becomes a MEMBER.
     * Idempotent for re-joining after having left.
     */
    public GroupMemberDto joinGroup(UUID callerId, JoinGroupRequest req) {
        Group group = groupRepo.findByGroupCodeAndStatus(req.groupCode().toUpperCase(), "ACTIVE")
                .orElseThrow(InvalidCodeException::new);

        // Check if already an active member
        if (memberRepo.existsByGroup_IdAndUserIdAndLeftAtIsNull(group.getId(), callerId)) {
            throw new AlreadyAMemberException();
        }

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUserId(callerId);
        member.setNickname(req.nickname());
        member.setRole(GroupRole.MEMBER);

        member = memberRepo.save(member);
        log.info("User {} joined group {}", callerId, group.getId());
        return GroupMemberDto.from(member);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public GroupDto getGroup(UUID groupId) {
        return GroupDto.from(findActiveGroupOrThrow(groupId));
    }

    @Transactional(readOnly = true)
    public PageResponse<GroupMemberDto> getMembers(UUID groupId, UUID cursor, int limit) {
        List<GroupMember> members = memberRepo.findActiveMembers(
                groupId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = members.size() > limit;
        List<GroupMemberDto> page = members.stream()
                .limit(limit)
                .map(GroupMemberDto::from)
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).id().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Remove member ─────────────────────────────────────────────────────────

    /**
     * Soft-removes a member from the group. Only OWNER or ADMIN may call this,
     * enforced upstream by {@code @RequireGroupRole(GroupRole.ADMIN)}.
     * An OWNER cannot be removed (they must transfer ownership first).
     */
    public void removeMember(UUID groupId, UUID targetUserId) {
        GroupMember member = memberRepo
                .findByGroup_IdAndUserIdAndLeftAtIsNull(groupId, targetUserId)
                .orElseThrow(MemberNotFoundException::new);

        if (member.getRole() == GroupRole.OWNER) {
            throw new ForbiddenException("Cannot remove the group owner — transfer ownership first");
        }

        member.setLeftAt(OffsetDateTime.now());
        memberRepo.save(member);

        cacheService.evictAfterCommit(com.gala.otw_server.cache.CacheKeys.groupMember(groupId, targetUserId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Group findActiveGroupOrThrow(UUID groupId) {
        Group group = groupRepo.findById(groupId).orElseThrow(GroupNotFoundException::new);
        if (!"ACTIVE".equals(group.getStatus())) throw new GroupNotFoundException();
        return group;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = CodeGenerator.generate();
            if (!groupRepo.existsByGroupCode(code)) return code;
        }
        throw new IllegalStateException("Failed to generate a unique group code after " + MAX_CODE_ATTEMPTS + " attempts");
    }
}
