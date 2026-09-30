package com.gala.otw_server.photo;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.photo.service.GoogleDriveFileValidator;
import com.gala.otw_server.photo.service.PhotoService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
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

    @Mock
    private RoomPermissionService permissions;

    private PhotoService photoService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID uploaderId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID photoId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        photoService = new PhotoService(photoRepo, roomRepo, memberRepo, realtime, driveFileValidator, permissions);
        room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");
    }

    private Photo ownPhoto() {
        Photo photo = new Photo();
        photo.setId(photoId);
        photo.setRoom(room);
        photo.setUploadedBy(uploaderId);
        return photo;
    }

    @Test
    @DisplayName("registerPhoto persists photo metadata with caption and broadcasts realtime event")
    void registerPhoto_Success() {
        when(permissions.require(roomId, uploaderId, Permission.ADD_PHOTOS)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, uploaderId)).thenReturn(true);
        when(photoRepo.save(any(Photo.class))).thenAnswer(inv -> {
            Photo p = inv.getArgument(0);
            p.setId(photoId);
            return p;
        });

        RegisterPhotoRequest req = new RegisterPhotoRequest("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", " Bus selfie ");

        PhotoDto dto = photoService.registerPhoto(roomId, uploaderId, req);

        assertThat(dto.driveFileId()).isEqualTo("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
        assertThat(dto.uploadedBy()).isEqualTo(uploaderId);
        assertThat(dto.caption()).isEqualTo("Bus selfie");
        assertThat(dto.status()).isEqualTo("READY");
        verify(driveFileValidator).validate("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
        verify(photoRepo).save(any(Photo.class));
    }

    @Test
    @DisplayName("registerPhoto rejects and saves nothing when the Drive file fails validation")
    void registerPhoto_InvalidDriveFile_ThrowsAndSavesNothing() {
        when(permissions.require(roomId, uploaderId, Permission.ADD_PHOTOS)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, uploaderId)).thenReturn(true);
        doThrow(new InvalidPhotoReferenceException())
                .when(driveFileValidator).validate(anyString());

        RegisterPhotoRequest req = new RegisterPhotoRequest("not-a-real-file-id", null);

        assertThatThrownBy(() -> photoService.registerPhoto(roomId, uploaderId, req))
                .isInstanceOf(InvalidPhotoReferenceException.class);

        verify(photoRepo, never()).save(any(Photo.class));
    }

    @Test
    @DisplayName("registerPhoto is refused when the host turned off adding photos")
    void registerPhoto_PermissionDisabled() {
        when(permissions.require(roomId, uploaderId, Permission.ADD_PHOTOS))
                .thenThrow(new PermissionDisabledException("off"));

        assertThatThrownBy(() -> photoService.registerPhoto(roomId, uploaderId, new RegisterPhotoRequest("id", null)))
                .isInstanceOf(PermissionDisabledException.class);
        verifyNoInteractions(driveFileValidator);
    }

    @Test
    @DisplayName("deletePhoto allows uploader to delete their own photo")
    void deletePhoto_UploaderAllowed() {
        Photo photo = ownPhoto();
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(photo));
        when(permissions.isHost(roomId, uploaderId)).thenReturn(false);
        when(permissions.allows(room, uploaderId, Permission.DELETE_OWN_PHOTOS)).thenReturn(true);

        photoService.deletePhoto(roomId, photoId, uploaderId);

        verify(photoRepo).delete(photo);
    }

    @Test
    @DisplayName("deletePhoto of own photo is refused when 'Delete only their own photos' is off")
    void deletePhoto_OwnButDisabled() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(ownPhoto()));
        when(permissions.isHost(roomId, uploaderId)).thenReturn(false);
        when(permissions.allows(room, uploaderId, Permission.DELETE_OWN_PHOTOS)).thenReturn(false);

        assertThatThrownBy(() -> photoService.deletePhoto(roomId, photoId, uploaderId))
                .isInstanceOf(PermissionDisabledException.class);
        verify(photoRepo, never()).delete(any());
    }

    @Test
    @DisplayName("deletePhoto throws ForbiddenException when non-uploader non-host attempts deletion")
    void deletePhoto_ForbiddenForOtherMember() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(ownPhoto()));
        when(permissions.isHost(roomId, otherUserId)).thenReturn(false);

        assertThatThrownBy(() -> photoService.deletePhoto(roomId, photoId, otherUserId))
                .isInstanceOf(ForbiddenException.class);

        verify(photoRepo, never()).delete(any());
    }

    @Test
    @DisplayName("deletePhoto lets the host delete anyone's photo")
    void deletePhoto_HostAllowed() {
        Photo photo = ownPhoto();
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(photo));
        when(permissions.isHost(roomId, otherUserId)).thenReturn(true);

        photoService.deletePhoto(roomId, photoId, otherUserId);

        verify(photoRepo).delete(photo);
    }
}
