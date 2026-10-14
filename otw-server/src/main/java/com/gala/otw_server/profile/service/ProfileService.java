package com.gala.otw_server.profile.service;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.dto.UploadSessionDto;
import com.gala.otw_server.photo.service.DriveUploadBudget;
import com.gala.otw_server.photo.service.DriveUploadSessionService;
import com.gala.otw_server.photo.service.GalaDriveFolderService;
import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.dto.RoomMemberProfileDto;
import com.gala.otw_server.profile.dto.StartProfilePhotoUploadRequest;
import com.gala.otw_server.profile.entity.UserProfile;
import com.gala.otw_server.profile.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class ProfileService {

    private final UserProfileRepository profiles;
    private final ProfilePhotoDriveService photoDrive;
    private final DriveUploadSessionService uploads;
    private final GalaDriveFolderService driveFiles;
    private final DriveUploadBudget uploadBudget;
    private final Clock clock;

    @Autowired
    public ProfileService(UserProfileRepository profiles,
                          ProfilePhotoDriveService photoDrive,
                          DriveUploadSessionService uploads,
                          GalaDriveFolderService driveFiles,
                          DriveUploadBudget uploadBudget) {
        this(profiles, photoDrive, uploads, driveFiles, uploadBudget, Clock.systemUTC());
    }

    ProfileService(UserProfileRepository profiles, ProfilePhotoDriveService photoDrive,
                   DriveUploadSessionService uploads, GalaDriveFolderService driveFiles,
                   DriveUploadBudget uploadBudget, Clock clock) {
        this.profiles = profiles;
        this.photoDrive = photoDrive;
        this.uploads = uploads;
        this.driveFiles = driveFiles;
        this.uploadBudget = uploadBudget;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(UUID userId) {
        return profiles.findById(userId).map(ProfileDto::from).orElseGet(ProfileDto::empty);
    }

    /** Saved profiles of a gala's active members, one page at a time (caller is already checked as a member). */
    @Transactional(readOnly = true)
    public PageResponse<RoomMemberProfileDto> listForRoom(UUID roomId, UUID cursor, int limit) {
        List<UserProfile> found = profiles.findForActiveMembers(roomId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = found.size() > limit;
        List<RoomMemberProfileDto> page = found.stream()
                .limit(limit)
                .map(RoomMemberProfileDto::from)
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).userId().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    /**
     * A one-time Drive upload URL in the shared "Profile Photos" folder, for a file the server names
     * after the caller. The browser sends the bytes straight to Google, then saves the returned id
     * with {@code PUT /me/profile}.
     */
    public UploadSessionDto startPhotoUpload(UUID userId, StartProfilePhotoUploadRequest req, String origin) {
        uploadBudget.chargeProfileUpload(userId);
        String folderId = photoDrive.ensureFolder();
        String name = ProfilePhotoDriveService.fileName(userId, req.mimeType(), clock.millis());
        return new UploadSessionDto(uploads.openSession(folderId, name, req.mimeType(), req.size(), origin));
    }

    /**
     * Replaces the whole profile. A new photo id must be the caller's own upload in the profile folder;
     * it is made viewable by link, and the previous photo is trashed once the row is saved.
     */
    @Transactional
    public ProfileDto update(UUID userId, ProfileDto req) {
        String photoId = req.photoDriveFileId() == null || req.photoDriveFileId().isBlank()
                ? null : req.photoDriveFileId().trim();

        UserProfile p = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
        String oldPhotoId = p.getPhotoDriveFileId();
        boolean photoChanged = !Objects.equals(oldPhotoId, photoId);
        if (photoChanged && photoId != null) {
            photoDrive.checkOwnPhoto(photoId, userId);
            driveFiles.makeLinkViewable(photoId);
        }

        p.setNickname(req.nickname().trim());
        p.setStatus(req.status().trim());
        p.setColor(req.color());
        p.setPhotoDriveFileId(photoId);
        ProfileDto saved = ProfileDto.from(profiles.save(p));

        if (photoChanged && oldPhotoId != null) afterCommit(() -> driveFiles.trashFile(oldPhotoId));
        return saved;
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
