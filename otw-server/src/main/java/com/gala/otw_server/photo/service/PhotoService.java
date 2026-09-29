package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.MemberNotFoundException;
import com.gala.otw_server.common.DomainExceptions.NotARoomMemberException;
import com.gala.otw_server.common.DomainExceptions.PhotoNotFoundException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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

    public PhotoService(PhotoRepository photoRepo,
                        RoomRepository roomRepo,
                        RoomMemberRepository memberRepo,
                        RealtimeEventPublisher realtime,
                        GoogleDriveFileValidator driveFileValidator) {
        this.photoRepo = photoRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.driveFileValidator = driveFileValidator;
    }

    // ── Register photo metadata ───────────────────────────────────────────────

    public PhotoDto registerPhoto(UUID roomId, UUID callerId, RegisterPhotoRequest req) {
        Room room = verifyActiveRoom(roomId);
        verifyMemberOfRoom(roomId, callerId);
        driveFileValidator.validate(req.driveFileId().trim());

        Photo photo = new Photo();
        photo.setRoom(room);
        photo.setDriveFileId(req.driveFileId().trim());
        photo.setUploadedBy(callerId);
        photo.setStatus("READY");

        Photo saved = photoRepo.save(photo);
        PhotoDto dto = PhotoDto.from(saved);

        publishAfterCommit(roomId, "photo.added", dto);
        return dto;
    }

    // ── List photos ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<PhotoDto> getPhotos(UUID roomId, UUID cursor, int limit) {
        verifyActiveRoom(roomId);

        List<Photo> photos = photoRepo.findPhotos(
                roomId,
                cursor,
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

    public void deletePhoto(UUID roomId, UUID photoId, UUID callerId) {
        verifyActiveRoom(roomId);

        Photo photo = photoRepo.findByIdAndRoom_Id(photoId, roomId)
                .orElseThrow(PhotoNotFoundException::new);

        // Host or the original uploader can delete
        if (!photo.getUploadedBy().equals(callerId)) {
            RoomMember member = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                    .orElseThrow(NotARoomMemberException::new);
            if (member.getRole() != RoomRole.HOST) {
                throw new ForbiddenException("Only the uploader or the room host can delete this photo");
            }
        }

        photoRepo.delete(photo);

        publishAfterCommit(roomId, "photo.deleted", Map.of(
                "id", photoId,
                "roomId", roomId
        ));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Room verifyActiveRoom(UUID roomId) {
        return roomRepo.findById(roomId)
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .orElseThrow(RoomNotFoundException::new);
    }

    private void verifyMemberOfRoom(UUID roomId, UUID userId) {
        boolean isMember = memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId);
        if (!isMember) {
            throw new MemberNotFoundException();
        }
    }

    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, event, payload);
                }
            });
        } else {
            realtime.publish(roomId, event, payload);
        }
    }
}
