'use client';

/**
 * Barkada Awards e-certificate, drawn in the browser on a canvas (1080 x 1350, a 4:5 portrait that fits
 * Instagram). Nothing is uploaded or stored: it's made from the result data each time it's opened.
 * It's a fixed brand artwork, not themed, so a shared image looks the same for everyone. The hex values below
 * mirror the OTW brand tokens (a canvas can't read CSS variables as colours reliably).
 */
import type { Tone } from './data';

const W = 1080;
const H = 1350;

const C = {
  cream: '#fff8f2',
  rosy: '#e0417c',
  rosyDark: '#c22e64',
  zest: '#f8e140',
  zestDark: '#c9b418',
  blossom: '#eac7df',
  teal: '#2f8aa3',
  tealDark: '#1f6376',
} as const;

const TONE: Record<Tone, { bg: string; on: string; shadow: string }> = {
  rosy: { bg: C.rosy, on: C.cream, shadow: C.rosyDark },
  teal: { bg: C.teal, on: C.cream, shadow: C.tealDark },
  zest: { bg: C.zest, on: C.tealDark, shadow: C.zestDark },
  blossom: { bg: C.blossom, on: C.tealDark, shadow: C.rosy },
};

const SPARKLE = 'M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z';

export interface CertificateInput {
  name: string;
  /** The award, e.g. "Ang Tagasalba". */
  award: string;
  /** The one-line blurb under it. */
  blurb: string;
  gala: string;
  /** e.g. "Oct 24-25, 2026" */
  date: string;
  tone: Tone;
  /** The winner's profile photo URL, when they have one. */
  photo?: string;
}

const FD = "Fredoka, 'Nunito', system-ui, sans-serif";
const FB = "Nunito, system-ui, sans-serif";

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`700 64px Fredoka`),
      document.fonts.load(`600 40px Fredoka`),
      document.fonts.load(`800 34px Nunito`),
      document.fonts.load(`700 34px Nunito`),
    ]);
  } catch {
    /* fall back to the system font: the certificate still draws */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // A Drive profile photo is cross-origin: ask for CORS so drawing it doesn't taint the canvas (if Drive
    // refuses, the load fails and the initial is drawn instead).
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The biggest font size (down to `min`) at which `text` fits `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, start: number, min: number, maxWidth: number) {
  let size = start;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

/** Wraps `text` into at most `maxLines` lines no wider than `maxWidth` (the last line gets an ellipsis if cut). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines - 1) {
        line = words.slice(i).join(' ');
        break;
      }
    }
  }
  if (line) lines.push(line);
  return lines.map((l, i) => {
    if (i === lines.length - 1) {
      let out = l;
      while (ctx.measureText(out).width > maxWidth && out.length > 1) out = out.slice(0, -2) + '…';
      return out;
    }
    return l;
  });
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(SPARKLE));
  ctx.restore();
}

/** Draws the certificate and returns it as a PNG. */
export async function renderCertificate(input: CertificateInput): Promise<Blob> {
  await loadFonts();
  const tone = TONE[input.tone];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // paper
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  roundRect(ctx, 36, 36, W - 72, H - 72, 56);
  ctx.clip();
  ctx.fillStyle = C.blossom;
  ctx.beginPath();
  ctx.arc(90, 120, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.zest;
  ctx.beginPath();
  ctx.arc(W - 90, H - 120, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 + 40, 520, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // frame
  ctx.lineWidth = 14;
  ctx.strokeStyle = C.rosy;
  roundRect(ctx, 36, 36, W - 72, H - 72, 56);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.tealDark;
  ctx.setLineDash([2, 14]);
  ctx.lineCap = 'round';
  roundRect(ctx, 66, 66, W - 132, H - 132, 40);
  ctx.stroke();
  ctx.setLineDash([]);

  // header: the real OTW logo (public/otw-logo.svg), straight on the paper
  try {
    const logo = await loadImage('/otw-logo.svg');
    // The logo file is square with empty space above and below; crop to the same 1500:1027 window the site uses.
    const sh = (logo.naturalWidth * 1027) / 1500;
    const sy = (logo.naturalHeight - sh) / 2;
    const lw = 340;
    const lh = (lw * 1027) / 1500;
    ctx.drawImage(logo, 0, sy, logo.naturalWidth, sh, (W - lw) / 2, 74, lw, lh);
  } catch {
    // the logo file couldn't load: the wordmark keeps the header from being empty
    ctx.fillStyle = C.rosy;
    ctx.font = `700 90px ${FD}`;
    ctx.fillText('OTW', W / 2, 220);
  }

  ctx.fillStyle = C.rosy;
  ctx.font = `600 40px ${FD}`;
  ctx.fillText('Sertipiko ng Parangal', W / 2, 340);
  sparkle(ctx, W / 2 - 245, 328, 24, C.zestDark);
  sparkle(ctx, W / 2 + 245, 328, 24, C.zestDark);

  // the winner's avatar
  const cx = W / 2;
  const cy = 506;
  const r = 116;
  ctx.fillStyle = tone.shadow;
  ctx.beginPath();
  ctx.arc(cx, cy + 10, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  let drewPhoto = false;
  if (input.photo) {
    try {
      const img = await loadImage(input.photo);
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
      drewPhoto = true;
    } catch {
      /* no photo: the initial below */
    }
  }
  if (!drewPhoto) {
    ctx.fillStyle = tone.bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = tone.on;
    ctx.font = `700 140px ${FD}`;
    ctx.textBaseline = 'middle';
    ctx.fillText((input.name.trim()[0] ?? '?').toUpperCase(), cx, cy + 6);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  sparkle(ctx, cx + r + 52, cy - r + 14, 40, C.zestDark);
  sparkle(ctx, cx - r - 48, cy + r - 30, 28, C.rosy);

  // text
  ctx.fillStyle = C.teal;
  ctx.font = `800 34px ${FB}`;
  ctx.fillText('Pinarangalan si', W / 2, 688);

  ctx.fillStyle = C.tealDark;
  const nameSize = fit(ctx, input.name, (n) => `700 ${n}px ${FD}`, 100, 44, W - 220);
  ctx.font = `700 ${nameSize}px ${FD}`;
  ctx.fillText(input.name, W / 2, 688 + 30 + nameSize * 0.85);

  // the award, on a pill in its colour
  const pillY = 852;
  const pillH = 112;
  const awardSize = fit(ctx, input.award, (n) => `700 ${n}px ${FD}`, 60, 32, W - 300);
  ctx.font = `700 ${awardSize}px ${FD}`;
  const pillW = Math.min(W - 160, ctx.measureText(input.award).width + 112);
  ctx.fillStyle = tone.shadow;
  roundRect(ctx, (W - pillW) / 2, pillY + 9, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = tone.bg;
  roundRect(ctx, (W - pillW) / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = tone.on;
  ctx.textBaseline = 'middle';
  ctx.fillText(input.award, W / 2, pillY + pillH / 2 + 3);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = C.teal;
  ctx.font = `700 32px ${FB}`;
  const lines = wrap(ctx, input.blurb, W - 260, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 1034 + i * 42));

  ctx.fillStyle = C.tealDark;
  const footer = `${input.gala} · ${input.date}`;
  const fSize = fit(ctx, footer, (n) => `800 ${n}px ${FB}`, 32, 22, W - 260);
  ctx.font = `800 ${fSize}px ${FB}`;
  ctx.fillText(footer, W / 2, 1142);

  // the OTW seal, centred at the bottom where nothing else is
  const sx = W / 2;
  const sy = 1222;
  ctx.fillStyle = C.rosyDark;
  ctx.beginPath();
  ctx.arc(sx, sy + 5, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.rosy;
  ctx.beginPath();
  ctx.arc(sx, sy, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 7]);
  ctx.beginPath();
  ctx.arc(sx, sy, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  sparkle(ctx, sx, sy - 8, 30, C.zest);
  ctx.fillStyle = C.cream;
  ctx.font = `700 18px ${FD}`;
  ctx.fillText('OTW', sx, sy + 26);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}

/** A safe file name like "otw-ana-ang-tagasalba.png". */
export function certificateFileName(name: string, award: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  return `otw-${slug(name) || 'winner'}-${slug(award) || 'award'}.png`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Whether this browser can share an image file (needs HTTPS and a supporting browser). */
export function canShareFile(blob: Blob, fileName: string): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false;
    return navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** Opens the share sheet with the image. Returns false when the person closed it. */
export async function shareCertificate(blob: Blob, fileName: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: 'OTW Barkada Awards', text });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false;
    throw e;
  }
}
