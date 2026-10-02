'use client';

import Link from 'next/link';
import { Button, Icon, Sheet, blob } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { toast } from '@/lib/otw/feedback';
import { MORE, galaHref } from './nav';
import { useCopyCode } from './useCopyCode';
import { useLogOut } from './useLogOut';

/** Renders whichever shell sheet is open (More, Share). Copy from reference sheetHtml(). */
export function GalaSheets() {
  const { sheet, closeSheet, gala } = useGala();
  const copyCode = useCopyCode();
  const logOut = useLogOut();

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
          <Link href="/me/galas" className="mo" onClick={closeSheet}>
            <span className="ico" style={blob(MORE.length)}>
              <Icon name="calendar" size={24} />
            </span>
            My Galas
          </Link>
          <button
            type="button"
            className="mo"
            onClick={() => {
              closeSheet();
              logOut();
            }}
          >
            <span className="ico" style={blob(MORE.length + 1)}>
              <Icon name="back" size={24} />
            </span>
            Log out
          </button>
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

  // 'account' (the optional "Save this gala" sheet) is retired: an account is required to plan or join.
  return null;
}
