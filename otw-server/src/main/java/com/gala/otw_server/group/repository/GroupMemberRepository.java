package com.gala.otw_server.group.repository;

import com.gala.otw_server.group.entity.GroupMember;
import com.gala.otw_server.security.auth.GroupRole;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    /** Membership lookup — used by GroupAccessAspect cache fallback. */
    Optional<GroupMember> findByGroup_IdAndUserIdAndLeftAtIsNull(UUID groupId, UUID userId);

    boolean existsByGroup_IdAndUserIdAndLeftAtIsNull(UUID groupId, UUID userId);

    /** Paginated roster — cursor is the last seen member ID. */
    @Query("""
            SELECT m FROM GroupMember m
            WHERE m.group.id = :groupId
              AND m.leftAt IS NULL
              AND (:cursor IS NULL OR m.id > :cursor)
            ORDER BY m.joinedAt ASC, m.id ASC
            """)
    List<GroupMember> findActiveMembers(
            @Param("groupId") UUID groupId,
            @Param("cursor") UUID cursor,
            Pageable pageable);

    /** Check if a user is an OWNER or ADMIN (for elevated-action guards). */
    @Query("""
            SELECT COUNT(m) > 0 FROM GroupMember m
            WHERE m.group.id = :groupId
              AND m.userId = :userId
              AND m.leftAt IS NULL
              AND m.role IN :roles
            """)
    boolean existsByGroup_IdAndUserIdAndRoleIn(
            @Param("groupId") UUID groupId,
            @Param("userId") UUID userId,
            @Param("roles") List<GroupRole> roles);
}
