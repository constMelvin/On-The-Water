package com.gala.otw_server.expense.repository;

import com.gala.otw_server.expense.entity.SettlementPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SettlementPaymentRepository extends JpaRepository<SettlementPayment, UUID> {

    Optional<SettlementPayment> findByIdAndRoomId(UUID id, UUID roomId);

    /** All payments feed the balance math; a gala has a handful at most. */
    List<SettlementPayment> findByRoomIdOrderByCreatedAtDesc(UUID roomId);
}
