/** Backend DTOs used by the app (same shapes as otw-client/src/lib/api). */

export type RoomRole = 'MEMBER' | 'HOST';
export type RsvpStatus = 'PENDING' | 'GOING' | 'MAYBE' | 'NOT_GOING';
export type GalaPhase = 'PLANNING' | 'GALA_DAY' | 'DONE';
export type RoomType = 'GROUP' | 'COUPLE';
export type MyRoomsView = 'upcoming' | 'ongoing' | 'completed' | 'archived';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  limit: number;
}

export interface MyRoomDto {
  roomId: string;
  /** 8 characters, no OTW- prefix. */
  roomCode: string;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  type: RoomType;
  status: string;
  phase: GalaPhase;
  myRole: RoomRole;
  memberCount: number;
}

export interface RoomDto {
  id: string;
  roomCode: string;
  title: string;
  destination: string;
  /** yyyy-mm-dd */
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  hostUserId: string;
  status: string;
  type: RoomType;
  phase: GalaPhase;
  hasPassword: boolean;
  permissions: {
    membersCanEditPlan: boolean;
    membersCanAddPhotos: boolean;
    membersCanDeleteOwnPhotos: boolean;
    locationSharingEnabled: boolean;
  };
  listed: boolean;
  myRole: RoomRole | null;
  memberCount: number | null;
  createdAt: string;
}

export interface RoomPreviewDto {
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  type: RoomType;
  memberCount: number;
  nicknames: string[];
  full: boolean;
}

export interface RoomMemberDto {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  role: RoomRole;
  rsvpStatus: RsvpStatus;
  joinedAt: string;
}

export interface CreateRoomRequest {
  title: string;
  nickname: string;
  /** yyyy-mm-dd */
  startDate: string;
  endDate?: string;
  /** hh:mm */
  startTime?: string;
  endTime?: string;
  destination: string;
  /** The destination's map pin, when a place was picked; send both or neither. */
  destinationLat?: number;
  destinationLng?: number;
  password: string;
  type?: RoomType;
  /** Where everyone meets, as text. */
  meetingLabel?: string;
}

export interface NotificationDto {
  id: string;
  roomId: string | null;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ProfileDto {
  nickname: string;
  status: string;
  color: string | null;
  photoDriveFileId: string | null;
}

/** One listed gala on Join a Gala (GET /rooms/directory). */
export interface DirectoryRoomDto {
  roomCode: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  type: RoomType;
  hostNickname: string | null;
  memberCount: number;
  full: boolean;
  alreadyMember: boolean;
}
