/**
 * Google Drive upload for the Gala Dump (mobile port of otw-client/src/lib/otw/drive.ts). Nobody signs in to
 * Google: the backend opens a one-time Drive upload link in this gala's own folder (POST /rooms/{id}/photos/uploads)
 * and the phone PUTs the file straight to Google through it. The backend never handles the bytes. POST
 * /rooms/{id}/photos then registers the file id.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Biggest file the Dump takes (same limit as the server). */
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

export const isVideo = (mimeType: string | null | undefined) => !!mimeType?.startsWith('video/');

/** Thumbnail URL for a link-viewable Drive image or video (w = width in px). */
export const driveThumb = (fileId: string, w = 800) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${w}`;

/** Drive's own player, for videos in the viewer. */
export const drivePlayer = (fileId: string) => `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;

/** Drive's download link for the original file (gala files are viewable by link). */
export const driveDownload = (fileId: string) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

export type UploadStage = 'compressing' | 'uploading';

/** Asks the backend for a one-time upload link for a file of this name, type and size. */
export type StartUpload = (file: { fileName: string; mimeType: string; size: number }) => Promise<string>;

/** A picked file (expo-image-picker asset or a camera shot). */
export interface LocalFile {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

/**
 * Uploads one photo or video into the gala's Drive folder. Photos are shrunk to 2560 px JPEG first (like the web);
 * videos go up as they are (up to MAX_UPLOAD_BYTES). Resolves to the Drive file id.
 */
export async function uploadToDrive(file: LocalFile, startUpload: StartUpload, onProgress?: (stage: UploadStage) => void): Promise<string> {
  const video = isVideo(file.mimeType);
  let uri = file.uri;
  let type = file.mimeType || 'image/jpeg';
  let name = file.fileName || (video ? 'video.mp4' : 'photo.jpg');
  if (!video) {
    onProgress?.('compressing');
    try {
      const out = await manipulateAsync(uri, [{ resize: { width: 2560 } }], { compress: 0.8, format: SaveFormat.JPEG });
      uri = out.uri;
      type = 'image/jpeg';
      name = name.replace(/\.[^.]+$/, '') + '.jpg';
    } catch {
      /* keep the original */
    }
  }
  const info = await FileSystem.getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  if (!size) throw new Error('Hindi mabasa ‘yang file. Try another one.');
  if (size > MAX_UPLOAD_BYTES) throw new Error('That file is too big (300 MB max). Trim it first.');

  onProgress?.('uploading');
  const uploadUrl = await startUpload({ fileName: name, mimeType: type, size });
  let res: FileSystem.FileSystemUploadResult;
  try {
    res = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': type },
    });
  } catch {
    throw new Error(`That ${video ? 'video' : 'photo'} didn't upload. Check your connection and try again.`);
  }
  if (res.status >= 400) {
    if (res.body.includes('storageQuotaExceeded')) throw new Error("The gala's Google Drive is full. Free up space, then try again.");
    throw new Error(`That ${video ? 'video' : 'photo'} didn't upload. Try again.`);
  }
  return (JSON.parse(res.body) as { id: string }).id;
}
