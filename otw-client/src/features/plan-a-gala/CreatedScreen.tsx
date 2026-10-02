'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Button, Icon, Sheet, blob } from '@/components/otw';
import { burst, burstEl, toast } from '@/lib/otw/feedback';
import { FocusLayout } from './FocusLayout';

export interface CreatedScreenProps {
  code: string;
  title: string;
  password: string;
}

/** "Okay, this is happening." Hands over the code, keeps the password safe. */
export function CreatedScreen({ code, title, password }: CreatedScreenProps) {
  const [showPw, setShowPw] = useState(false);
  const [share, setShare] = useState(false);

  // Sparkle burst on arrival.
  useEffect(() => {
    burst(window.innerWidth / 2, window.innerHeight * 0.4);
  }, []);

  const copy = (text: string, msg: string) => (e: MouseEvent<HTMLElement>) => {
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      /* clipboard blocked: the toast still confirms */
    }
    toast(msg);
    burstEl(e.currentTarget);
  };
  const copyCode = copy(code, 'Gala code copied.');

  const shareNative = () => {
    const text = `G tayo? Join our gala “${title}”.\nGala code: ${code}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else toast("Your device's share sheet opens here.");
  };

  return (
    <FocusLayout tone="rosy">
      <div className="cwrap">
        <div className="c-left">
          <span className="ico xl cel" style={blob(0)}>
            <Icon name="burst" size={44} />
          </span>
          <h1 className="h1">Okay, this is happening.</h1>
          <p className="lead">Your gala is ready. Share the code with your friends so they can jump in.</p>
          <div className="ticket">
            <span className="tk-l">Gala Code</span>
            <b className="tk-c">{code}</b>
            <div className="tk-a">
              <Button variant="zest" sm onClick={copyCode}>
                <Icon name="copy" size={18} /> Copy Gala Code
              </Button>
              <Button variant="cream" sm onClick={() => setShare(true)}>
                <Icon name="share" size={18} /> Share Gala
              </Button>
            </div>
          </div>
        </div>

        <div className="c-right">
          <div className="pwrow">
            <span className="ico sm">
              <Icon name="lock" size={20} />
            </span>
            <div>
              <b>Gala Password</b>
              <code className="pwv">{showPw ? password : '••••••••••'}</code>
            </div>
            <button
              type="button"
              className="ibtn dark"
              onClick={() => setShowPw((v) => !v)}
              aria-label={`${showPw ? 'Hide' : 'Show'} password`}
            >
              <Icon name={showPw ? 'eyeoff' : 'eye'} size={20} />
            </button>
            <button type="button" className="ibtn dark" onClick={copy(password, 'Gala password copied.')} aria-label="Copy password">
              <Icon name="copy" size={20} />
            </button>
          </div>
          <p className="fine cream-t">
            Share the Gala Code with your friends. Keep the Gala Password somewhere safe so you can come back later.
          </p>
          {/* No optional-account card: an account is already required to plan a gala. */}
        </div>
      </div>

      <div className="fbar solo">
        <Link className="btn zest" href={`/gala/${encodeURIComponent(code)}`}>
          Enter the Gala
        </Link>
      </div>

      {share && (
        <Sheet
          title="Share Gala"
          onClose={() => setShare(false)}
          footer={
            <>
              <Button variant="teal" onClick={copyCode}>
                <Icon name="copy" size={18} /> Copy code
              </Button>
              <Button variant="zest" onClick={shareNative}>
                <Icon name="share" size={18} /> Share…
              </Button>
            </>
          }
        >
          <p className="fine">Send this to your GC. We never include the password.</p>
          <div className="sharemsg">
            G tayo? Join our gala “{title}”.
            <br />
            Gala code: <b>{code}</b>
          </div>
        </Sheet>
      )}
    </FocusLayout>
  );
}
