package com.gala.otw_server.location.controller;

import com.gala.otw_server.location.dto.MemberLocationDto;
import com.gala.otw_server.location.dto.UpdateLocationRequest;
import com.gala.otw_server.location.service.LocationService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}")
public class LocationController {

    private final LocationService locationService;
    private final CurrentUserProvider currentUser;

    public LocationController(LocationService locationService, CurrentUserProvider currentUser) {
        this.locationService = locationService;
        this.currentUser = currentUser;
    }

    // ── PUT /rooms/{roomId}/location — share PIN or update LIVE location ───────

    @PutMapping("/location")
    @RequireRoomRole(RoomRole.MEMBER)
    public MemberLocationDto updateLocation(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateLocationRequest req) {
        return locationService.updateLocation(roomId, currentUser.getUserId(), req);
    }

    // ── DELETE /rooms/{roomId}/location — stop sharing location ───────────────

    @DeleteMapping("/location")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void stopSharingLocation(@PathVariable UUID roomId) {
        locationService.stopSharingLocation(roomId, currentUser.getUserId());
    }

    // ── GET /rooms/{roomId}/locations — active shared locations ───────────────

    @GetMapping("/locations")
    @RequireRoomRole(RoomRole.MEMBER)
    public List<MemberLocationDto> getLocations(@PathVariable UUID roomId) {
        return locationService.getLocations(roomId);
    }
}
