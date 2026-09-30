package com.gala.otw_server.room.controller;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.MyRoomDto;
import com.gala.otw_server.room.dto.MyRoomStatsDto;
import com.gala.otw_server.room.repository.MyRoomQueryRepository.View;
import com.gala.otw_server.room.service.MeService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireAccount;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Account area: My Galas + Calendar, Gala History, "Save this gala". Account-only
 * ({@code 401 ACCOUNT_REQUIRED} for anonymous sessions). Not room-scoped — every query
 * is keyed by the caller's own user id — so no {@code @RequireRoomRole}.
 */
@RestController
@RequestMapping("/api/v1/me")
@RequireAccount
public class MeController {

    private final MeService meService;
    private final CurrentUserProvider currentUser;

    public MeController(MeService meService, CurrentUserProvider currentUser) {
        this.meService = meService;
        this.currentUser = currentUser;
    }

    /**
     * {@code ?view=upcoming|ongoing|completed|archived} for the lists, or
     * {@code ?from=YYYY-MM-DD&to=YYYY-MM-DD} for the month/week calendar.
     */
    @GetMapping("/rooms")
    public PageResponse<MyRoomDto> getMyRooms(
            @RequestParam(required = false) String view,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        if (from != null || to != null) {
            if (from == null || to == null) {
                throw new InvalidRequestException("Send both 'from' and 'to' for a calendar range");
            }
            return meService.getMyRoomsInRange(currentUser.getUserId(), from, to, cursor, safeLimit);
        }
        return meService.getMyRooms(currentUser.getUserId(), parseView(view), cursor, safeLimit);
    }

    private static View parseView(String view) {
        if (view == null || view.isBlank()) return View.UPCOMING;
        try {
            return View.valueOf(view.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidRequestException("view must be one of upcoming, ongoing, completed, archived");
        }
    }

    @GetMapping("/rooms/stats")
    public MyRoomStatsDto getStats() {
        return meService.getStats(currentUser.getUserId());
    }

    /** Call right after upgrading an anonymous session to an account ("Create an Account"). */
    @PostMapping("/link-account")
    public Map<String, Integer> linkAccount() {
        return Map.of("galasSaved", meService.linkAccount(currentUser.getUserId()));
    }
}
