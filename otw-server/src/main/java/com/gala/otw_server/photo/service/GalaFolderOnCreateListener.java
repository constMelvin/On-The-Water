package com.gala.otw_server.photo.service;

import com.gala.otw_server.room.dto.GalaCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Makes the new gala's Drive folder once Plan a Gala commits. Failures are logged, never surfaced. */
@Component
public class GalaFolderOnCreateListener {

    private static final Logger log = LoggerFactory.getLogger(GalaFolderOnCreateListener.class);

    private final GalaDriveFolderService folders;

    public GalaFolderOnCreateListener(GalaDriveFolderService folders) {
        this.folders = folders;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onGalaCreated(GalaCreatedEvent event) {
        if (!folders.isConfigured()) return;
        try {
            folders.ensureFolder(event.roomId());
        } catch (RuntimeException ex) {
            // The first upload (POST /rooms/{id}/photos/uploads) creates it instead.
            log.warn("Drive folder for new room {} not created yet: {}", event.roomId(), ex.getMessage());
        }
    }
}
