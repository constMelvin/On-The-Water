package com.gala.otw_server.budget.repository;

import com.gala.otw_server.budget.entity.BudgetEstimate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BudgetEstimateRepository extends JpaRepository<BudgetEstimate, UUID> {
}
