-- ==============================================================================
-- V7: Room type (Couple Mode) and the "What members can do" settings toggles
-- ==============================================================================

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(10) NOT NULL DEFAULT 'GROUP';
ALTER TABLE rooms ADD CONSTRAINT chk_rooms_room_type CHECK (room_type IN ('GROUP', 'COUPLE'));

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS members_can_edit_plan         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS members_can_add_photos        BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS members_can_delete_own_photos BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_sharing_enabled      BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE rooms ADD CONSTRAINT chk_rooms_status CHECK (status IN ('ACTIVE', 'ARCHIVED'));
