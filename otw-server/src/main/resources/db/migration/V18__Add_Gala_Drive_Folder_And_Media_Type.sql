-- Gala Dump storage: every gala gets its own Google Drive folder (created by the backend's
-- service account inside GOOGLE_DRIVE_PHOTOS_FOLDER_ID); uploads must land in it.
ALTER TABLE rooms ADD COLUMN drive_folder_id VARCHAR(200);

-- Photos and videos share the Dump; the Drive MIME type tells the frontend which player to use.
ALTER TABLE photos ADD COLUMN mime_type VARCHAR(100);
