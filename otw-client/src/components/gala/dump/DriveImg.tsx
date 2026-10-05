'use client';

import { useEffect, useState } from 'react';
import { driveThumb } from '@/lib/otw/drive';

const RETRIES = 3;
const RETRY_MS = 1500;

export interface DriveImgProps {
  fileId: string;
  /** Width in px asked of Drive. */
  w?: number;
  alt: string;
  loading?: 'lazy' | 'eager';
  /** Called once every retry has failed. */
  onFail?: () => void;
}

/**
 * A Drive thumbnail that retries a few times before giving up: right after an upload Drive may not
 * have made the thumbnail yet, and the thumbnail link is sometimes rate-limited (HTTP 429).
 * Remote, variable-size image: a plain img (next/image would need remotePatterns). Give it a
 * `key` per file so the retry count starts over for each photo.
 */
export function DriveImg({ fileId, w, alt, loading, onFail }: DriveImgProps) {
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => {
      setAttempt((a) => a + 1);
      setWaiting(false);
    }, RETRY_MS * (attempt + 1));
    return () => clearTimeout(t);
  }, [waiting, attempt]);

  if (waiting) return null;
  // The extra param only makes each retry a fresh request instead of the browser's cached failure.
  const src = driveThumb(fileId, w) + (attempt ? `&r=${attempt}` : '');
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      loading={loading}
      onError={() => (attempt < RETRIES ? setWaiting(true) : onFail?.())}
    />
  );
}
