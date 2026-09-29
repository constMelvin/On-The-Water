'use client';

import Link from 'next/link';
import { Button, Icon, Sheet, blob } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { toast } from '@/lib/otw/feedback';
import { MORE, galaHref } from './nav';
import { useCopyCode } from './useCopyCode';

/** Renders whichever shell sheet is open (More, Share, Account). Copy from reference sheetHtml(). */
export function GalaSheets() {
  const { sheet, closeSheet, openSheet, gala, hasAccount } = useGala();
  const copyCode = useCopyCode();

  if (sheet === 'more') {
    return (
      <Sheet title="More" onClose={closeSheet}>
        <div className="morep">
          {MORE.map((d, i) => (
            <Link key={d.seg} href={galaHref(gala.code, d.seg)} className="mo" onClick={closeSheet}>
              <span className="ico" style={blob(i)}>
                <Icon name={d.icon} size={24} />
              </span>
              {d.label}
            </Link>
          ))}
          {hasAccount ? (
            <Link href="/me/galas" className="mo" onClick={closeSheet}>
              <span className="ico" style={blob(MORE.length)}>
                <Icon name="calendar" size={24} />
              </span>
              My Galas
            </Link>
          ) : (
            <button type="button" className="mo" onClick={() => openSheet('account')}>
              <span className="ico" style={blob(MORE.length)}>
                <Icon name="calendar" size={24} />
              </span>
              Save gala
            </button>
          )}
        </div>
      </Sheet>
    );
  }

  if (sheet === 'share') {
    const share = () => {
      const text = `G tayo? Join our gala “${gala.title}”.\nGala code: ${gala.code}`;
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else toast("Your device's share sheet opens here.");
    };
    return (
      <Sheet
        title="Share Gala"
        onClose={closeSheet}
        footer={
          <>
            <Button variant="teal" onClick={copyCode}>
              <Icon name="copy" size={18} /> Copy code
            </Button>
            <Button variant="zest" onClick={share}>
              <Icon name="share" size={18} /> Share…
            </Button>
          </>
        }
      >
        <p className="fine">Send this to your GC. We never include the password.</p>
        <div className="sharemsg">
          G tayo? Join our gala “{gala.title}”.
          <br />
          Gala code: <b>{gala.code}</b>
        </div>
      </Sheet>
    );
  }

  if (sheet === 'account') {
    return (
      <Sheet
        title="Want to keep your gala with you?"
        onClose={closeSheet}
        footer={
          <>
            <Button variant="ghost" onClick={closeSheet}>
              Maybe Later
            </Button>
            <Link
              className="btn rosy"
              href={`/login?tab=create&gala=${encodeURIComponent(gala.code)}`}
              onClick={closeSheet}
            >
              Create an Account
            </Link>
          </>
        }
      >
        <p>
          Create an account to save your galas, keep a personal calendar, view your gala history, and get reminders.
        </p>
        <ul className="ticks">
          {['Saved galas, one tap away', 'Your galas on any device', 'Reminders when the day gets close'].map((x) => (
            <li key={x}>
              <Icon name="check" size={18} />
              {x}
            </li>
          ))}
        </ul>
        <p className="fine">Your current gala can still continue without an account.</p>
      </Sheet>
    );
  }

  return null;
}
