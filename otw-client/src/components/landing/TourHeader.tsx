import s from './walkthrough.module.css';

/**
 * The tour's heading. Shared by the light placeholder (WalkthroughSlot) and the real tour (Walkthrough), so
 * nothing jumps when the tour loads in. Plain markup: no client JavaScript.
 */
export function TourHeader() {
  return (
    <header className={s.head}>
      <h2 id="tour-title">See it for yourself.</h2>
      <p>Just scroll. This is what a gala looks like on OTW.</p>
      <a className={s.skip} href="#features">
        Skip the tour
      </a>
    </header>
  );
}
