-- ==============================================================================
-- V26: Profile photos move to Google Drive
-- ==============================================================================
-- Owner decision 2026-10-13: profile photos no longer live in the database. The browser
-- uploads the photo to the shared "Profile Photos" Drive folder (one folder for every
-- account, inside GOOGLE_DRIVE_PHOTOS_FOLDER_ID); the row keeps only the Drive file id.
-- Existing data-URL photos are dropped on purpose (owner decision): people re-upload.

ALTER TABLE user_profiles DROP COLUMN IF EXISTS photo;

ALTER TABLE user_profiles
    ADD COLUMN photo_drive_file_id VARCHAR(200)
        CHECK (photo_drive_file_id IS NULL OR photo_drive_file_id ~ '^[A-Za-z0-9_-]{1,200}$');
