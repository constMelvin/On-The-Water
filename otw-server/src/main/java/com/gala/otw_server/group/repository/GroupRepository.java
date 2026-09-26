package com.gala.otw_server.group.repository;

import com.gala.otw_server.group.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    Optional<Group> findByGroupCodeAndStatus(String groupCode, String status);

    boolean existsByGroupCode(String groupCode);
}
