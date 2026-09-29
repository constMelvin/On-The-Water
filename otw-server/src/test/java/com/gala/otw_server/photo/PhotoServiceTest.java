package com.gala.otw_server.photo;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.photo.service.GoogleDriveFileValidator;
import com.gala.otw_server.photo.service.PhotoService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoServiceTest {

    @Mock
    private PhotoRepository photoRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private GoogleDriveFileValidator driveFileValidator;

    private PhotoService photoService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID uploaderId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID photoId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        photoService = new PhotoService(photoRepo, roomRepo, memberRepo, realtime, driveFileValidator);
    }

    @Test
    @DisplayName("registerPhoto persists photo metadata and broadcasts realtime event")
    void registerPhoto_Success() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, uploaderId)).thenReturn(true);
        when(photoRepo.save(any(Photo.class))).thenAnswer(inv -> {
            Photo p = inv.getArgument(0);
            p.setId(photoId);
            return p;
        });

        RegisterPhotoRequest req = new RegisterPhotoRequest("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");

        PhotoDto dto = photoService.registerPhoto(roomId, uploaderId, req);

        assertThat(dto.driveFileId()).isEqualTo("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
        assertThat(dto.uploadedBy()).isEqualTo(uploaderId);
        assertThat(dto.status()).isEqualTo("READY");
        verify(driveFileValidator).validate("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
        verify(photoRepo).save(any(Photo.class));
    }

    @Test
    @DisplayName("registerPhoto rejects and saves nothing when the Drive file fails validation")
    void registerPhoto_InvalidDriveFile_ThrowsAndSavesNothing() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, uploaderId)).thenReturn(true);
        doThrow(new InvalidPhotoReferenceException())
                .when(driveFileValidator).validate(anyString());

        RegisterPhotoRequest req = new RegisterPhotoRequest("not-a-real-file-id");

        assertThatThrownBy(() -> photoService.registerPhoto(roomId, uploaderId, req))
                .isInstanceOf(InvalidPhotoReferenceException.class);

        verify(photoRepo, never()).save(any(Photo.class));
    }

    @Test
    @DisplayName("deletePhoto allows uploader to delete their own photo")
    void deletePhoto_UploaderAllowed() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        Photo photo = new Photo();
        photo.setId(photoId);
        photo.setRoom(room);
        photo.setUploadedBy(uploaderId);

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(photo));

        photoService.deletePhoto(roomId, photoId, uploaderId);

        verify(photoRepo).delete(photo);
    }

    @Test
    @DisplayName("deletePhoto throws ForbiddenException when non-uploader non-host attempts deletion")
    void deletePhoto_ForbiddenForOtherMember() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        Photo photo = new Photo();
        photo.setId(photoId);
        photo.setRoom(room);
        photo.setUploadedBy(uploaderId); // Uploaded by uploaderId

        RoomMember otherMember = new RoomMember();
        otherMember.setRole(RoomRole.MEMBER); // Regular member, not host

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(photo));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, otherUserId)).thenReturn(Optional.of(otherMember));

        assertThatThrownBy(() -> photoService.deletePhoto(roomId, photoId, otherUserId))
                .isInstanceOf(ForbiddenException.class);

        verify(photoRepo, never()).delete(any());
    }
}
