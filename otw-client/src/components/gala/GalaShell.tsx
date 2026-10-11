'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AvatarStack, Icon, Tag } from '@/components/otw';
import { AccountCluster } from '@/components/nav/AccountCluster';
import { useGala } from '@/lib/otw/gala-store';
import { GBOT, GNAV, PTABS, SETTINGS, galaHref } from './nav';
import { GalaSheets } from './GalaSheets';
import { useCopyCode } from './useCopyCode';
import { DevSwitcher } from './DevSwitcher';

export function GalaShell({ children }: { children: ReactNode }) {
  const { gala, members, role, unread, openSheet } = useGala();
  const pathname = usePathname();
  const copyCode = useCopyCode();

  // /gala/[code]/[seg] -> seg ('' on the dashboard)
  const seg = pathname.split('/')[3] ?? '';
  const href = (s: string) => galaHref(gala.code, s);
  const showTabs = PTABS.some((t) => t.seg === seg);
  const badge = (s: string) => s === 'chat' && seg !== 'chat' && unread > 0 && <em className="badge">{unread}</em>;
  const going = members.filter((m) => m.s === 'g').map((m) => ({ name: m.n, userId: m.id, tone: m.c }));

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="logo cr brandbox" aria-label="OTW home" title="OTW home" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="bb-bg" aria-hidden="true">
            <i className="bb-b1" />
            <i className="bb-b2" />
            <i className="bb-s1" />
            <i className="bb-s2" />
            <i className="bb-s3" />
          </span>
          <Image src="/otw-logo.svg" alt="OTW" width={1500} height={1027} className="logoimg" priority />
        </Link>

        <div className="gmini">
          <b>{gala.title}</b>
          {gala.range && <span>{gala.range}</span>}
          <button type="button" className="codepill" onClick={copyCode} aria-label="Copy gala code">
            <Icon name="copy" size={14} /> {gala.code}
          </button>
        </div>

        <nav className="snav" aria-label="Gala">
          {GNAV.map((d) => (
            <Link
              key={d.seg}
              href={href(d.seg)}
              className={`sn${seg === d.seg ? ' on' : ''}`}
              title={d.label}
              aria-current={seg === d.seg ? 'page' : undefined}
            >
              <Icon name={d.icon} size={22} />
              <span className="lbl">{d.label}</span>
              {badge(d.seg)}
            </Link>
          ))}
        </nav>

        <div className="sfoot">
          <Link
            href={href(SETTINGS.seg)}
            className={`sn${seg === SETTINGS.seg ? ' on' : ''}`}
            title={SETTINGS.label}
            aria-current={seg === SETTINGS.seg ? 'page' : undefined}
          >
            <Icon name="sliders" size={22} />
            <span className="lbl">Settings</span>
          </Link>
          {/* My Galas, Profile and Log out live in the account menu at the top right (AccountCluster). */}
        </div>
      </aside>

      <div className="mw">
        <div className="topbar">
          <div className="tb-l">
            <Link href="/" className="ibtn only-m" aria-label="OTW home" title="OTW home" style={{ color: 'var(--rosy)' }}>
              <Icon name="pin" size={24} />
            </Link>
            <button type="button" className="ibtn only-m" onClick={() => openSheet('more')} aria-label="More">
              <Icon name="more" size={24} />
            </button>
            <b className="tb-t">{gala.title}</b>
            <button type="button" className="codepill hide-m" onClick={copyCode} aria-label="Copy gala code">
              <Icon name="copy" size={14} /> {gala.code}
            </button>
          </div>
          <div className="tb-r">
            {role === 'leader' ? (
              <Tag variant="zest" icon="crown">
                Gala Leader
              </Tag>
            ) : (
              <Tag variant="blossom" icon="user">
                Member
              </Tag>
            )}
            <AvatarStack people={going} size={30} max={4} />
            <AccountCluster />
          </div>
        </div>

        {showTabs && (
          <nav className="ptabs" aria-label="Plan">
            {PTABS.map((t) => (
              <Link
                key={t.seg}
                href={href(t.seg)}
                className={seg === t.seg ? 'on' : undefined}
                aria-current={seg === t.seg ? 'page' : undefined}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        <main className="main">{children}</main>
      </div>

      <nav className="bnav" aria-label="Main">
        {GBOT.map((d) => (
          <Link
            key={d.seg}
            href={href(d.seg)}
            className={`bn${seg === d.seg ? ' on' : ''}`}
            aria-label={d.label}
            aria-current={seg === d.seg ? 'page' : undefined}
          >
            <Icon name={d.icon} size={26} />
            {badge(d.seg)}
          </Link>
        ))}
      </nav>

      <GalaSheets />
      <div id="otw-toast" className="toast-host" role="status" aria-live="polite" />
      <DevSwitcher />
    </div>
  );
}
