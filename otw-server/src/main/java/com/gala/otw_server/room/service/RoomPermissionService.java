package com.gala.otw_server.room.service;

import com.gala.otw_server.common.DomainExceptions.NotARoomMemberException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Enforces the gala settings "What members can do" toggles. Runs after
 * {@code @RequireRoomRole} has already confirmed membership; the Gala Leader (HOST)
 * is never restricted.
 */
@Service
@Transactional(readOnly = true)
public class RoomPermissionService {

    public enum Permission {
        EDIT_PLAN("The Gala Leader turned off plan editing for members"),
        ADD_PHOTOS("The Gala Leader turned off adding photos for members"),
        DELETE_OWN_PHOTOS("The Gala Leader turned off deleting photos for members"),
        SHARE_LOCATION("Live location sharing is turned off for this gala");

        private final String message;

        Permission(String message) {
            this.message = message;
        }
    }

    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;

    public RoomPermissionService(RoomRepository roomRepo, RoomMemberRepository memberRepo) {
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
    }

    /** Returns the room if the caller may do this; throws {@code 403 PERMISSION_DISABLED} otherwise. */
    public Room require(UUID roomId, UUID callerId, Permission permission) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (isHost(roomId, callerId)) return room;
        if (!allowed(room, permission)) {
            throw new PermissionDisabledException(permission.message);
        }
        return room;
    }

    /** Non-throwing variant, e.g. to decide whether a delete is allowed. */
    public boolean allows(Room room, UUID callerId, Permission permission) {
        return isHost(room.getId(), callerId) || allowed(room, permission);
    }

    public boolean isHost(UUID roomId, UUID callerId) {
        RoomMember member = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .orElseThrow(NotARoomMemberException::new);
        return member.getRole() == RoomRole.HOST;
    }

    private static boolean allowed(Room room, Permission permission) {
        return switch (permission) {
            case EDIT_PLAN -> room.isMembersCanEditPlan();
            case ADD_PHOTOS -> room.isMembersCanAddPhotos();
            case DELETE_OWN_PHOTOS -> room.isMembersCanDeleteOwnPhotos();
            case SHARE_LOCATION -> room.isLocationSharingEnabled();
        };
    }
}
