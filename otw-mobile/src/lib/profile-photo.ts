import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/api/client';

/** Same limits as the backend (StartProfilePhotoUploadRequest): image/jpeg|png|webp, 2 MB max. */
const SIZE = 256;
const MAX_BYTES = 2 * 1024 * 1024;

export class PhotoError extends Error {}

/** Thumbnail URL for a profile photo's Drive file id. */
export const profilePhotoUrl = (fileId?: string | null) => (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w${SIZE}` : undefined);

/** Lets the person pick and square-crop a photo, shrunk to 256 px JPEG. Null when cancelled. */
export async function pickProfilePhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: SIZE, height: SIZE } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return out.uri;
}

/**
 * Uploads a picked photo straight to the shared Drive profile folder through a one-time link from
 * POST /me/profile/photo/uploads, and returns its Drive file id. Saving that id with PUT /me/profile
 * makes it the account's photo (the server checks it is this account's upload).
 */
export async function uploadProfilePhoto(uri: string): Promise<string> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !info.size) throw new PhotoError('Hindi mabasa ‘yang photo. Try another one.');
  if (info.size > MAX_BYTES) throw new PhotoError('That photo is too big (2 MB max).');

  const mimeType = 'image/jpeg';
  const { uploadUrl } = await api<{ uploadUrl: string }>('/me/profile/photo/uploads', {
    method: 'POST',
    body: { mimeType, size: info.size },
  });
  const res = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': mimeType },
  });
  if (res.status >= 400) throw new PhotoError('That photo didn’t upload. Try again.');
  const id = (JSON.parse(res.body) as { id?: string }).id;
  if (!id) throw new PhotoError('That photo didn’t upload. Try again.');
  return id;
}
