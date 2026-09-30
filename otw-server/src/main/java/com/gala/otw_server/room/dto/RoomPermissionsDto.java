package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.Room;

/** Gala settings → "What members can do". The host is never restricted by these. */
public record RoomPermissionsDto(
        boolean membersCanEditPlan,
        boolean membersCanAddPhotos,
        boolean membersCanDeleteOwnPhotos,
        boolean locationSharingEnabled
) {
    public static RoomPermissionsDto from(Room r) {
        return new RoomPermissionsDto(
                r.isMembersCanEditPlan(),
                r.isMembersCanAddPhotos(),
                r.isMembersCanDeleteOwnPhotos(),
                r.isLocationSharingEnabled());
    }
}
