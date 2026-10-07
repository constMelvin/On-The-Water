'use client';

/**
 * Google Drive upload for the Gala Dump. Nobody signs in to Google: the backend opens a one-time
 * Drive upload link in this gala's own folder (POST /rooms/{id}/photos/uploads, using the
 * server's Drive account) and the browser sends the file straight to Google through it. The
 * backend never handles the bytes (master plan §9). POST /rooms/{id}/photos then registers the
 * file id; the server checks it's an image or video in the gala's folder and makes it viewable
 * by link so every member can load it.
 */
import imageCompression from 'browser-image-compression';

/** Biggest file the Dump takes (same limit as the server). */
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

export const isVideo = (mimeType: string | null | undefined) => !!mimeType?.startsWith('video/');

/** Thumbnail URL for a link-viewable Drive image or video (w = width in px). */
export const driveThumb = (fileId: string, w = 800) =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${w}`;

/** Drive's own player, for videos in the viewer. */
export const drivePlayer = (fileId: string) => `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;

/** Drive's download link for the original file (gala files are viewable by link). */
export const driveDownload = (fileId: string) =>
  `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

export type UploadStage = 'compressing' | 'uploading';

/** Asks the backend for a one-time upload link for a file of this name, type and size. */
export type StartUpload = (file: { fileName: string; mimeType: string; size: number }) => Promise<string>;

/**
 * Uploads one photo or video into the gala's Drive folder. Photos are compressed first; videos
 * go up as they are (up to MAX_UPLOAD_BYTES). Resolves to the Drive file id.
 */
export async function uploadToDrive(
  file: File,
  startUpload: StartUpload,
  onProgress?: (stage: UploadStage) => void
): Promise<string> {
  const video = file.type.startsWith('video/');
  if (!video && !file.type.startsWith('image/')) throw new Error('Only photos and videos can go in the Gala Dump.');

  let body: Blob = file;
  if (!video) {
    onProgress?.('compressing');
    // No web worker: the library's worker loads its code from a CDN, which the CSP (rightly) blocks.
    body = await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2560, useWebWorker: false }).catch(
      () => file
    );
  }
  if (body.size > MAX_UPLOAD_BYTES) throw new Error('That file is too big (300 MB max). Trim it first.');

  onProgress?.('uploading');
  const type = body.type || file.type;
  const uploadUrl = await startUpload({
    fileName: file.name || (video ? 'video.mp4' : 'photo.jpg'),
    mimeType: type,
    size: body.size,
  });

  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body });
  } catch {
    throw new Error(`That ${video ? 'video' : 'photo'} didn't upload. Check your connection and try again.`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // A service account can't own files outside a Shared Drive: the server needs the owner's Google account.
    if (detail.includes('storageQuotaExceeded')) {
      throw new Error(
        detail.includes('Service Accounts')
          ? "Uploads aren't fully set up yet: the server must upload as the owner's Google account (see GOOGLE_DRIVE_REFRESH_TOKEN in otw-server/.env)."
          : "The gala's Google Drive is full. Free up space, then try again."
      );
    }
    throw new Error(`That ${video ? 'video' : 'photo'} didn't upload. Try again.`);
  }
  const { id } = (await res.json()) as { id: string };
  return id;
}
