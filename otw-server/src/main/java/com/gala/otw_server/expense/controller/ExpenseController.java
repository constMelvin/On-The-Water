package com.gala.otw_server.expense.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.expense.dto.CreateExpenseRequest;
import com.gala.otw_server.expense.dto.ExpenseDto;
import com.gala.otw_server.expense.dto.SettlementDto;
import com.gala.otw_server.expense.service.ExpenseService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final CurrentUserProvider currentUser;

    public ExpenseController(ExpenseService expenseService, CurrentUserProvider currentUser) {
        this.expenseService = expenseService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/expenses — list expenses, paginated ────────────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<ExpenseDto> getExpenses(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return expenseService.getExpenses(roomId, cursor, Math.min(limit, 50));
    }

    // ── POST /rooms/{roomId}/expenses — add expense ───────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public ExpenseDto createExpense(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateExpenseRequest req) {
        return expenseService.createExpense(roomId, currentUser.getUserId(), req);
    }

    // ── DELETE /rooms/{roomId}/expenses/{expenseId} — delete expense ──────────

    @DeleteMapping("/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void deleteExpense(
            @PathVariable UUID roomId,
            @PathVariable UUID expenseId) {
        expenseService.deleteExpense(roomId, expenseId, currentUser.getUserId());
    }

    // ── GET /rooms/{roomId}/expenses/settlement — computed who owes who ────────

    @GetMapping("/settlement")
    @RequireRoomRole(RoomRole.MEMBER)
    public SettlementDto getSettlement(@PathVariable UUID roomId) {
        return expenseService.calculateSettlement(roomId);
    }
}
