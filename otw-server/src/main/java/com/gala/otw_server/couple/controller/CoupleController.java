package com.gala.otw_server.couple.controller;

import com.gala.otw_server.couple.dto.CoupleIdeaDto;
import com.gala.otw_server.couple.entity.CoupleIdea;
import com.gala.otw_server.couple.service.CoupleService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/couple")
public class CoupleController {

    private final CoupleService coupleService;
    private final CurrentUserProvider currentUser;

    public CoupleController(CoupleService coupleService, CurrentUserProvider currentUser) {
        this.coupleService = coupleService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/couple/ideas — catalog (fixed size) + saved flags ──

    @GetMapping("/ideas")
    @RequireRoomRole(RoomRole.MEMBER)
    public List<CoupleIdeaDto> getIdeas(@PathVariable UUID roomId) {
        return coupleService.getIdeas(roomId);
    }

    // ── PUT / DELETE /rooms/{roomId}/couple/ideas/{key} — heart / un-heart ────

    @PutMapping("/ideas/{key}")
    @RequireRoomRole(RoomRole.MEMBER)
    public CoupleIdeaDto saveIdea(@PathVariable UUID roomId, @PathVariable CoupleIdea key) {
        return coupleService.saveIdea(roomId, key, currentUser.getUserId());
    }

    @DeleteMapping("/ideas/{key}")
    @RequireRoomRole(RoomRole.MEMBER)
    public CoupleIdeaDto unsaveIdea(@PathVariable UUID roomId, @PathVariable CoupleIdea key) {
        return coupleService.unsaveIdea(roomId, key);
    }
}
