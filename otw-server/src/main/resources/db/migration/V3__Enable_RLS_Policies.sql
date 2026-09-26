-- 1. Groups & Group Members
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active group members can read group details"
    ON "groups" FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT gm.group_id
            FROM group_members gm
            WHERE gm.user_id = auth.uid() AND gm.left_at IS NULL
        )
    );

CREATE POLICY "Active group members can read group roster"
    ON group_members FOR SELECT
    TO authenticated
    USING (
        group_id IN (
            SELECT gm.group_id
            FROM group_members gm
            WHERE gm.user_id = auth.uid() AND gm.left_at IS NULL
        )
    );

-- 2. Rooms & Room Members
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active room members can read room overview"
    ON rooms FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

CREATE POLICY "Active room members can read room members"
    ON room_members FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 3. Itinerary Items
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read itinerary items"
    ON itinerary_items FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 4. Checklist Items
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read checklist items"
    ON checklist_items FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 5. Budget Estimates
ALTER TABLE budget_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read budget estimate"
    ON budget_estimates FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 6. Expenses & Shares
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read expenses"
    ON expenses FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

CREATE POLICY "Room members can read expense shares"
    ON expense_shares FOR SELECT
    TO authenticated
    USING (
        expense_id IN (
            SELECT e.id
            FROM expenses e
            JOIN room_members rm ON rm.room_id = e.room_id
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 7. Member Locations
ALTER TABLE member_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read active locations"
    ON member_locations FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

-- 8. Photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read photo metadata"
    ON photos FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );
