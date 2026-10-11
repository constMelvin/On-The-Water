package com.gala.otw_server.award.controller;

import com.gala.otw_server.award.dto.AwardsDto;
import com.gala.otw_server.award.dto.CastVoteRequest;
import com.gala.otw_server.award.entity.AwardCategory;
import com.gala.otw_server.award.service.AwardService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Barkada Awards: the after-gala poll. Opening and closing are for the Gala Leader; voting is for every member. */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}/awards")
public class AwardController {

    private final AwardService awardService;
    private final CurrentUserProvider currentUser;

    public AwardController(AwardService awardService, CurrentUserProvider currentUser) {
        this.awardService = awardService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public AwardsDto get(@PathVariable UUID roomId) {
        return awardService.get(roomId, currentUser.getUserId());
    }

    @PostMapping("/poll")
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.HOST)
    public AwardsDto open(@PathVariable UUID roomId, @RequestParam(defaultValue = "48") int hours) {
        return awardService.open(roomId, currentUser.getUserId(), hours);
    }

    @PostMapping("/poll/close")
    @RequireRoomRole(RoomRole.HOST)
    public AwardsDto close(@PathVariable UUID roomId) {
        return awardService.close(roomId, currentUser.getUserId());
    }

    @PutMapping("/votes/{categoryKey}")
    @RequireRoomRole(RoomRole.MEMBER)
    public AwardsDto vote(
            @PathVariable UUID roomId,
            @PathVariable AwardCategory categoryKey,
            @Valid @RequestBody CastVoteRequest req) {
        return awardService.vote(roomId, currentUser.getUserId(), categoryKey, req.nomineeUserId());
    }
}
