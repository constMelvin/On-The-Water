-- ==============================================================================
-- V11: Expense category/note + recorded settlement payments ("Mark paid")
-- ==============================================================================
-- Settlement stays computed on read: net = paid − shares + payments sent − payments
-- received. Payments are insert/delete only — no running totals are stored.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'OTHER';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note     VARCHAR(255);
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_category
    CHECK (category IN ('FOOD', 'TRANSPORTATION', 'STAY', 'ACTIVITIES', 'OTHER'));

CREATE TABLE IF NOT EXISTS settlement_payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL,
    to_user_id   UUID NOT NULL,
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    recorded_by  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_payments_room ON settlement_payments(room_id, created_at DESC);

ALTER TABLE settlement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read settlement payments"
    ON settlement_payments FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );
