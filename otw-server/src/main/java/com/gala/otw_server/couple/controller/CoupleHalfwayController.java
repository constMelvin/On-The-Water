package com.gala.otw_server.couple.controller;

import com.gala.otw_server.couple.dto.HalfwayDto;
import com.gala.otw_server.couple.dto.SaveHomeRequest;
import com.gala.otw_server.couple.dto.SpotsDto;
import com.gala.otw_server.couple.entity.SpotCategory;
import com.gala.otw_server.couple.service.CoupleHalfwayService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Halfway Checker: homes, midpoint and nearby date spots for a couple gala. */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}/couple/halfway")
public class CoupleHalfwayController {

    private final CoupleHalfwayService halfwayService;
    private final CurrentUserProvider currentUser;

    public CoupleHalfwayController(CoupleHalfwayService halfwayService, CurrentUserProvider currentUser) {
        this.halfwayService = halfwayService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public HalfwayDto get(@PathVariable UUID roomId) {
        return halfwayService.get(roomId, currentUser.getUserId());
    }

    @PutMapping("/home")
    @RequireRoomRole(RoomRole.MEMBER)
    public HalfwayDto saveHome(@PathVariable UUID roomId, @Valid @RequestBody SaveHomeRequest req) {
        return halfwayService.saveHome(roomId, currentUser.getUserId(), req);
    }

    @GetMapping("/spots")
    @RequireRoomRole(RoomRole.MEMBER)
    public SpotsDto spots(@PathVariable UUID roomId, @RequestParam SpotCategory category) {
        return halfwayService.spots(roomId, currentUser.getUserId(), category);
    }
}
