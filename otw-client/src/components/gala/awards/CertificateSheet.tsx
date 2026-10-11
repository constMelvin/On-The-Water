'use client';

/**
 * One winner's e-certificate: drawn in the browser (lib/otw/certificate.ts) when opened, previewed, then
 * downloaded as a PNG or shared. The image is never uploaded or stored.
 */
import { useEffect, useState } from 'react';
import { Button, Icon, Sheet } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { lookOf } from '@/lib/otw/profile';
import {
  canShareFile,
  certificateFileName,
  downloadBlob,
  renderCertificate,
  shareCertificate,
} from '@/lib/otw/certificate';
import type { AwardCategoryVM } from '@/lib/api/types';
import { AWARD_META } from './awards-meta';
import s from './certificate.module.css';

export interface CertificateTarget {
  userId: string;
  category: AwardCategoryVM;
}

export function CertificateSheet({ target, onClose }: { target: CertificateTarget; onClose: () => void }) {
  const { gala, nameOf, toneOf } = useGala();
  const [file, setFile] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  const name = nameOf(target.userId);
  const fileName = certificateFileName(name, target.category.title);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const meta = AWARD_META[target.category.key];
    const look = lookOf(target.userId);
    renderCertificate({
      name,
      award: target.category.title,
      blurb: target.category.blurb,
      gala: gala.title || 'our gala',
      date: gala.range || gala.date || '',
      tone: look?.tone ?? toneOf(target.userId) ?? meta.tone,
      photo: look?.photo,
    })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setFile({ blob, url });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // The certificate is drawn once for this winner and award.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.userId, target.category.key]);

  const share = async () => {
    if (!file) return;
    try {
      await shareCertificate(file.blob, fileName, `${name} is ${target.category.title} ng ${gala.title || 'barkada'}!`);
    } catch {
      toast("Couldn't open sharing. Download it instead.", 'err');
    }
  };

  return (
    <Sheet
      title="Certificate"
      onClose={onClose}
      footer={
        <>
          {file && canShareFile(file.blob, fileName) && (
            <Button variant="teal" onClick={share}>
              <Icon name="share" size={18} /> Share
            </Button>
          )}
          <Button
            variant="rosy"
            disabled={!file}
            onClick={() => {
              if (!file) return;
              downloadBlob(file.blob, fileName);
              toast('Downloaded.');
            }}
          >
            <Icon name="download" size={18} /> Download
          </Button>
        </>
      }
    >
      <div className={s.frame}>
        {file ? (
          // Plain <img>: a blob URL made in this browser.
          <img className={s.img} src={file.url} alt={`Certificate: ${name} is ${target.category.title} of ${gala.title || 'the gala'}`} />
        ) : failed ? (
          <p className={s.msg} role="alert">
            Couldn&apos;t make the certificate. Try again in a moment.
          </p>
        ) : (
          <div className={s.loading} role="status" aria-label="Making the certificate" />
        )}
      </div>
    </Sheet>
  );
}
