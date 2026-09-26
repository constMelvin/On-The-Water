package com.gala.otw_server.budget.controller;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.dto.UpdateBudgetRequest;
import com.gala.otw_server.budget.service.BudgetService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/budget")
public class BudgetController {

    private final BudgetService budgetService;
    private final CurrentUserProvider currentUser;

    public BudgetController(BudgetService budgetService, CurrentUserProvider currentUser) {
        this.budgetService = budgetService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/budget — view estimate ─────────────────────────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public BudgetDto getBudget(@PathVariable UUID roomId) {
        return budgetService.getBudget(roomId);
    }

    // ── PUT /rooms/{roomId}/budget — set estimate (Host only) ──────────────────

    @PutMapping
    @RequireRoomRole(RoomRole.HOST)
    public BudgetDto setBudget(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateBudgetRequest req) {
        return budgetService.setBudget(roomId, currentUser.getUserId(), req);
    }
}
