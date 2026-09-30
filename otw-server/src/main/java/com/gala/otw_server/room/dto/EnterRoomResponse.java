package com.gala.otw_server.room.dto;

import com.gala.otw_server.security.auth.RoomRole;

import java.util.List;
import java.util.UUID;

/**
 * Response of {@code POST /rooms/enter}. If the caller is already an active member
 * ({@code alreadyMember}), the frontend goes straight to the dashboard; otherwise it
 * shows the "Which one are you?" picker built from {@code members}.
 */
public record EnterRoomResponse(
        UUID roomId,
        String title,
        boolean alreadyMember,
        List<ClaimableMember> members
) {
    /** {@code hasAccount} members can't be picked — they log in instead. */
    public record ClaimableMember(UUID memberId, String nickname, RoomRole role, boolean hasAccount) {}
}
