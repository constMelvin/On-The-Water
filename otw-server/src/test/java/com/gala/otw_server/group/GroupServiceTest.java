package com.gala.otw_server.group;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.group.dto.CreateGroupRequest;
import com.gala.otw_server.group.dto.GroupDto;
import com.gala.otw_server.group.dto.GroupMemberDto;
import com.gala.otw_server.group.dto.JoinGroupRequest;
import com.gala.otw_server.group.entity.Group;
import com.gala.otw_server.group.entity.GroupMember;
import com.gala.otw_server.group.repository.GroupMemberRepository;
import com.gala.otw_server.group.repository.GroupRepository;
import com.gala.otw_server.group.service.GroupService;
import com.gala.otw_server.security.auth.GroupRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private GroupRepository groupRepo;

    @Mock
    private GroupMemberRepository memberRepo;

    @Mock
    private CacheService cacheService;

    private GroupService groupService;

    private final UUID callerId = UUID.randomUUID();
    private final UUID groupId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        groupService = new GroupService(groupRepo, memberRepo, cacheService);
    }

    @Test
    @DisplayName("createGroup saves group and assigns caller as OWNER")
    void createGroup_success() {
        CreateGroupRequest req = new CreateGroupRequest("Barkada Trip", "Melvin");

        when(groupRepo.existsByGroupCode(anyString())).thenReturn(false);
        when(groupRepo.save(any(Group.class))).thenAnswer(inv -> {
            Group g = inv.getArgument(0);
            g.setId(groupId);
            return g;
        });

        GroupDto result = groupService.createGroup(callerId, req);

        assertThat(result.id()).isEqualTo(groupId);
        assertThat(result.name()).isEqualTo("Barkada Trip");
        assertThat(result.groupCode()).isNotNull();

        verify(memberRepo).save(argThat(member ->
                member.getRole() == GroupRole.OWNER &&
                member.getUserId().equals(callerId) &&
                "Melvin".equals(member.getNickname())
        ));
    }

    @Test
    @DisplayName("joinGroup adds member when code is valid and user is not already member")
    void joinGroup_success() {
        JoinGroupRequest req = new JoinGroupRequest("GRP12345", "Alex");
        Group group = new Group();
        group.setId(groupId);
        group.setGroupCode("GRP12345");
        group.setStatus("ACTIVE");

        when(groupRepo.findByGroupCodeAndStatus("GRP12345", "ACTIVE")).thenReturn(Optional.of(group));
        when(memberRepo.existsByGroup_IdAndUserIdAndLeftAtIsNull(groupId, callerId)).thenReturn(false);
        when(memberRepo.save(any(GroupMember.class))).thenAnswer(inv -> {
            GroupMember m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setJoinedAt(OffsetDateTime.now());
            return m;
        });

        GroupMemberDto result = groupService.joinGroup(callerId, req);

        assertThat(result.userId()).isEqualTo(callerId);
        assertThat(result.nickname()).isEqualTo("Alex");
        assertThat(result.role()).isEqualTo(GroupRole.MEMBER);
    }

    @Test
    @DisplayName("joinGroup throws InvalidCodeException when group not found")
    void joinGroup_invalidCode() {
        JoinGroupRequest req = new JoinGroupRequest("BADCODE1", "Alex");
        when(groupRepo.findByGroupCodeAndStatus("BADCODE1", "ACTIVE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.joinGroup(callerId, req))
                .isInstanceOf(InvalidCodeException.class);
    }

    @Test
    @DisplayName("joinGroup throws AlreadyAMemberException when user is already active member")
    void joinGroup_alreadyMember() {
        JoinGroupRequest req = new JoinGroupRequest("GRP12345", "Alex");
        Group group = new Group();
        group.setId(groupId);
        group.setStatus("ACTIVE");

        when(groupRepo.findByGroupCodeAndStatus("GRP12345", "ACTIVE")).thenReturn(Optional.of(group));
        when(memberRepo.existsByGroup_IdAndUserIdAndLeftAtIsNull(groupId, callerId)).thenReturn(true);

        assertThatThrownBy(() -> groupService.joinGroup(callerId, req))
                .isInstanceOf(AlreadyAMemberException.class);
    }

    @Test
    @DisplayName("getMembers returns paginated roster")
    void getMembers_success() {
        Group group = new Group();
        group.setId(groupId);

        GroupMember m1 = new GroupMember();
        m1.setId(UUID.randomUUID());
        m1.setGroup(group);
        m1.setUserId(UUID.randomUUID());
        m1.setNickname("User 1");
        m1.setRole(GroupRole.OWNER);
        m1.setJoinedAt(OffsetDateTime.now());

        GroupMember m2 = new GroupMember();
        m2.setId(UUID.randomUUID());
        m2.setGroup(group);
        m2.setUserId(UUID.randomUUID());
        m2.setNickname("User 2");
        m2.setRole(GroupRole.MEMBER);
        m2.setJoinedAt(OffsetDateTime.now());

        when(memberRepo.findActiveMembers(eq(groupId), any(), any(Pageable.class)))
                .thenReturn(List.of(m1, m2));

        PageResponse<GroupMemberDto> result = groupService.getMembers(groupId, null, 20);

        assertThat(result.items()).hasSize(2);
        assertThat(result.nextCursor()).isNull();
    }

    @Test
    @DisplayName("removeMember soft-deletes member and evicts cache")
    void removeMember_success() {
        UUID targetUserId = UUID.randomUUID();
        GroupMember member = new GroupMember();
        member.setId(UUID.randomUUID());
        member.setUserId(targetUserId);
        member.setRole(GroupRole.MEMBER);

        when(memberRepo.findByGroup_IdAndUserIdAndLeftAtIsNull(groupId, targetUserId))
                .thenReturn(Optional.of(member));

        groupService.removeMember(groupId, targetUserId);

        assertThat(member.getLeftAt()).isNotNull();
        verify(memberRepo).save(member);
        verify(cacheService).evictAfterCommit(eq("group:" + groupId + ":member:" + targetUserId));
    }

    @Test
    @DisplayName("removeMember throws ForbiddenException when attempting to remove OWNER")
    void removeMember_cannotRemoveOwner() {
        UUID targetUserId = UUID.randomUUID();
        GroupMember owner = new GroupMember();
        owner.setId(UUID.randomUUID());
        owner.setUserId(targetUserId);
        owner.setRole(GroupRole.OWNER);

        when(memberRepo.findByGroup_IdAndUserIdAndLeftAtIsNull(groupId, targetUserId))
                .thenReturn(Optional.of(owner));

        assertThatThrownBy(() -> groupService.removeMember(groupId, targetUserId))
                .isInstanceOf(ForbiddenException.class);
    }
}
