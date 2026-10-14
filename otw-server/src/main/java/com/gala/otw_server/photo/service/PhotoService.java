package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.MemberNotFoundException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.common.DomainExceptions.PhotoNotFoundException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.StartUploadRequest;
import com.gala.otw_server.photo.dto.UploadSessionDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class PhotoService {

    private final PhotoRepository photoRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final GoogleDriveFileValidator driveFileValidator;
    private final RoomPermissionService permissions;
    private final GalaDriveFolderService folders;
    private final DriveUploadSessionService uploads;
    private final DriveUploadBudget uploadBudget;

    public PhotoService(PhotoRepository photoRepo,
                        RoomRepository roomRepo,
                        RoomMemberRepository memberRepo,
                        RealtimeEventPublisher realtime,
                        GoogleDriveFileValidator driveFileValidator,
                        RoomPermissionService permissions,
                        GalaDriveFolderService folders,
                        DriveUploadSessionService uploads,
                        DriveUploadBudget uploadBudget) {
        this.photoRepo = photoRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.driveFileValidator = driveFileValidator;
        this.permissions = permissions;
        this.folders = folders;
        this.uploads = uploads;
        this.uploadBudget = uploadBudget;
    }

    // ── Start an upload: a one-time Drive upload URL in this gala's folder ────

    /**
     * Opens a Drive upload session in the gala's folder (made on the spot if the gala has none
     * yet). The browser sends the bytes straight to Google; nobody signs in to Google.
     */
    public UploadSessionDto startUpload(UUID roomId, UUID callerId, StartUploadRequest req, String origin) {
        permissions.require(roomId, callerId, Permission.ADD_PHOTOS);
        verifyMemberOfRoom(roomId, callerId);
        String name = UploadFileNames.clean(req.fileName(), req.mimeType());
        uploadBudget.chargeGalaUpload(callerId, req.size());
        String folderId = folders.ensureFolder(roomId);
        return new UploadSessionDto(uploads.openSession(folderId, name, req.mimeType(), req.size(), origin));
    }

    // ── Register photo metadata ───────────────────────────────────────────────

    public PhotoDto registerPhoto(UUID roomId, UUID callerId, RegisterPhotoRequest req) {
        Room room = permissions.require(roomId, callerId, Permission.ADD_PHOTOS);
        verifyMemberOfRoom(roomId, callerId);
        String mimeType = driveFileValidator.validate(req.driveFileId().trim(), room.getDriveFolderId());

        Photo photo = new Photo();
        photo.setRoom(room);
        photo.setDriveFileId(req.driveFileId().trim());
        photo.setUploadedBy(callerId);
        photo.setCaption(req.caption() == null || req.caption().isBlank() ? null : req.caption().trim());
        folders.makeLinkViewable(req.driveFileId().trim());
        photo.setMimeType(mimeType);
        photo.setStatus("READY");

        Photo saved = photoRepo.save(photo);
        PhotoDto dto = PhotoDto.from(saved);

        publishAfterCommit(roomId, "photo.added", dto);
        return dto;
    }

    // ── List photos (Everyone / Mine) ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<PhotoDto> getPhotos(UUID roomId, UUID uploadedBy, UUID cursor, int limit) {
        verifyRoomExists(roomId);

        OffsetDateTime cursorAt = com.gala.otw_server.common.CursorBounds.NEWEST;
        UUID cursorId = null;
        if (cursor != null) {
            Photo c = photoRepo.findByIdAndRoom_Id(cursor, roomId).orElse(null);
            if (c != null) {
                cursorAt = c.getCreatedAt();
                cursorId = c.getId();
            }
        }

        List<Photo> photos = photoRepo.findPhotos(
                roomId,
                uploadedBy,
                cursorAt,
                cursorId,
                PageRequest.of(0, limit + 1)
        );

        boolean hasMore = photos.size() > limit;
        List<PhotoDto> page = photos.stream()
                .limit(limit)
                .map(PhotoDto::from)
                .toList();

        String nextCursor = (hasMore && !page.isEmpty())
                ? page.get(page.size() - 1).id().toString()
                : null;

        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Delete photo metadata ─────────────────────────────────────────────────

    /**
     * The host can delete any photo. The uploader can delete their own while
     * "Delete only their own photos" is on. Nobody else can.
     */
    public void deletePhoto(UUID roomId, UUID photoId, UUID callerId) {
        Room room = verifyRoomExists(roomId);

        Photo photo = photoRepo.findByIdAndRoom_Id(photoId, roomId)
                .orElseThrow(PhotoNotFoundException::new);

        if (!permissions.isHost(roomId, callerId)) {
            if (!photo.getUploadedBy().equals(callerId)) {
                throw new ForbiddenException("Only the uploader or the room host can delete this photo");
            }
            if (!permissions.allows(room, callerId, Permission.DELETE_OWN_PHOTOS)) {
                throw new PermissionDisabledException("The Gala Leader turned off deleting photos for members");
            }
        }

        photoRepo.delete(photo);

        publishAfterCommit(roomId, "photo.deleted", Map.of(
                "id", photoId,
                "roomId", roomId
        ));
        // Trash the Drive file only once the row is gone. If this fails, the file has no row and
        // DriveOrphanSweeper trashes it later; a row never points at a missing file.
        String driveFileId = photo.getDriveFileId();
        if (driveFileId != null) afterCommit(() -> folders.trashFile(driveFileId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Archived rooms stay readable; writes are already blocked by {@code RoomAccessAspect}. */
    private Room verifyRoomExists(UUID roomId) {
        return roomRepo.findById(roomId)
                .orElseThrow(RoomNotFoundException::new);
    }

    private void verifyMemberOfRoom(UUID roomId, UUID userId) {
        boolean isMember = memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId);
        if (!isMember) {
            throw new MemberNotFoundException();
        }
    }

    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        afterCommit(() -> realtime.publish(roomId, event, payload));
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
