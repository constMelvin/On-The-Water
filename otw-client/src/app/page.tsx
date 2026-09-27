'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
});

interface Sparkle {
  id: number;
  tx: string;
  ty: string;
  left: string;
  top: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const handleTaraClick = () => {
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 44 + Math.random() * 46;
      newSparkles.push({
        id: Date.now() + i + Math.random(),
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
        left: `${18 + Math.random() * 20}%`,
        top: '0%',
      });
    }

    setSparkles((prev) => [...prev, ...newSparkles]);

    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => !newSparkles.some((ns) => ns.id === s.id)));
    }, 750);

    router.push('/plan');
  };

  return (
    <div className={`otw-landing ${fredoka.variable} ${nunito.variable}`}>
      {/* Scoped CSS to avoid bleeding into global styles or other routes */}
      <style jsx global>{`
        .otw-landing {
          --rosy: #e0417c;
          --rosy-dark: #c22e64;
          --zest: #f8e140;
          --zest-dark: #c9b418;
          --blossom: #eac7df;
          --teal: #2f8aa3;
          --teal-dark: #1f6376;
          --cream: #fff8f2;

          font-family: var(--font-nunito), sans-serif;
          background-color: var(--cream);
          color: #5c4655;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          box-sizing: border-box;
          min-height: 100vh;
        }

        .otw-landing * {
          box-sizing: border-box;
        }

        .otw-landing h1,
        .otw-landing h2,
        .otw-landing h3 {
          font-family: var(--font-fredoka), sans-serif;
          font-weight: 600;
          margin: 0;
        }

        /* ---- Navigation ---- */
        .otw-landing nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          max-width: 1120px;
          margin: 0 auto;
          position: relative;
          z-index: 5;
        }

        .otw-landing .logo-img {
          height: 44px;
          width: auto;
          display: block;
          object-fit: contain;
        }

        .otw-landing .nav-links {
          display: flex;
          gap: 28px;
          font-weight: 800;
          font-size: 14px;
          color: var(--teal-dark);
        }

        .otw-landing .nav-links a {
          text-decoration: none;
          color: inherit;
          transition: opacity 0.15s ease;
        }

        .otw-landing .nav-links a:hover {
          opacity: 0.8;
        }

        .otw-landing .nav-cta {
          background: var(--teal);
          color: #fff;
          font-family: var(--font-fredoka), sans-serif;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 26px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 5px 0 var(--teal-dark);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          display: inline-block;
        }

        .otw-landing .nav-cta:active {
          transform: translateY(4px);
          box-shadow: 0 1px 0 var(--teal-dark);
        }

        @media (max-width: 820px) {
          .otw-landing .nav-links {
            display: none;
          }
        }

        /* ---- Hero Section: Full Rosy Bleed ---- */
        .otw-landing .hero {
          background: linear-gradient(160deg, var(--rosy) 0%, var(--rosy-dark) 100%);
          position: relative;
          overflow: hidden;
          padding: 70px 28px 110px;
        }

        .otw-landing .hero-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        @media (max-width: 900px) {
          .otw-landing .hero-inner {
            grid-template-columns: 1fr;
          }
        }

        .otw-landing .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--zest);
          color: #5a4d10;
          font-weight: 800;
          font-size: 12.5px;
          padding: 8px 18px;
          border-radius: 999px;
          margin-bottom: 20px;
          transform: rotate(-2deg);
        }

        .otw-landing .hero h1 {
          color: #fff;
          font-size: 56px;
          line-height: 1.05;
          letter-spacing: -0.5px;
        }

        @media (max-width: 600px) {
          .otw-landing .hero h1 {
            font-size: 42px;
          }
        }

        .otw-landing .hero p.lead {
          color: #ffdcea;
          font-size: 18px;
          line-height: 1.6;
          max-width: 470px;
          margin: 22px 0 32px;
          font-weight: 700;
        }

        .otw-landing .hero-ctas {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
        }

        .otw-landing .btn-primary {
          background: var(--zest);
          color: #5a4d10;
          font-family: var(--font-fredoka), sans-serif;
          font-weight: 700;
          font-size: 18px;
          padding: 20px 38px;
          border-radius: 999px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          box-shadow: 0 7px 0 var(--zest-dark);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .otw-landing .btn-primary:active {
          transform: translateY(5px);
          box-shadow: 0 2px 0 var(--zest-dark);
        }

        .otw-landing .btn-ghost {
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          text-decoration: none;
          padding: 16px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 3px solid rgba(255, 255, 255, 0.5);
        }

        .otw-landing .sparkle-btn-wrap {
          position: relative;
        }

        .otw-landing .star-pop {
          position: absolute;
          font-size: 18px;
          pointer-events: none;
          animation: pop 0.7s ease-out forwards;
        }

        @keyframes pop {
          0% {
            transform: translate(0, 0) scale(0.4) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(1.1) rotate(40deg);
            opacity: 0;
          }
        }

        .otw-landing .hero-mascot {
          position: relative;
          height: 340px;
        }

        .otw-landing .mascot-blob {
          position: absolute;
          background: var(--cream);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .otw-landing .mb1 {
          top: 10px;
          left: 20px;
          width: 230px;
          height: 230px;
          border-radius: 58% 42% 45% 55% / 55% 48% 52% 45%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-6deg);
        }

        .otw-landing .mb2 {
          bottom: 0;
          right: 10px;
          width: 190px;
          padding: 18px;
          border-radius: 34px;
          transform: rotate(4deg);
        }

        .otw-landing .mb2 strong {
          font-size: 14px;
          display: block;
          color: var(--rosy-dark);
          font-family: var(--font-fredoka), sans-serif;
        }

        .otw-landing .mb2 small {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--teal-dark);
        }

        /* ---- How It Works: Full Zest Bleed ---- */
        .otw-landing .how {
          background: var(--zest);
          padding: 80px 28px;
          position: relative;
          overflow: hidden;
        }

        .otw-landing .how-inner {
          max-width: 1120px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .otw-landing .how h2 {
          font-size: 38px;
          color: #5a4d10;
        }

        .otw-landing .how-subtitle {
          color: #7a6a12;
          font-weight: 800;
          font-size: 15px;
          margin: 10px 0 46px;
        }

        .otw-landing .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 26px;
        }

        .otw-landing .step-blob {
          background: var(--cream);
          border-radius: 40px 40px 44px 44px / 48px 48px 40px 40px;
          padding: 34px 26px;
          box-shadow: 0 10px 0 rgba(0, 0, 0, 0.06);
          text-align: center;
        }

        .otw-landing .step-blob .num {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--rosy);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          margin: 0 auto 16px;
          box-shadow: 0 5px 0 var(--rosy-dark);
        }

        .otw-landing .step-blob h3 {
          font-size: 18px;
          color: var(--teal-dark);
          margin-bottom: 8px;
        }

        .otw-landing .step-blob p {
          font-size: 14px;
          color: #5c4655;
          line-height: 1.55;
          margin: 0;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .otw-landing .steps {
            grid-template-columns: 1fr;
          }
        }

        /* ---- Features: Full Teal Bleed, Blossom Blob Cards ---- */
        .otw-landing .features {
          background: var(--teal);
          padding: 80px 28px;
        }

        .otw-landing .features-inner {
          max-width: 1120px;
          margin: 0 auto;
        }

        .otw-landing .section-head {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 46px;
        }

        .otw-landing .section-head h2 {
          font-size: 36px;
          color: #fff;
        }

        .otw-landing .section-head p {
          color: #d7f0f6;
          font-size: 15px;
          font-weight: 700;
          margin-top: 12px;
        }

        .otw-landing .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .otw-landing .feature-card {
          background: var(--blossom);
          border-radius: 46% 54% 38% 62% / 50% 42% 58% 50%;
          padding: 36px 28px;
          text-align: center;
          box-shadow: 0 10px 0 rgba(0, 0, 0, 0.08);
          transition: transform 0.15s ease;
        }

        .otw-landing .feature-card:hover {
          transform: translateY(-4px) rotate(-1deg);
        }

        .otw-landing .feature-card .icon-blob {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          border-radius: 50% 50% 40% 60% / 60% 40% 60% 40%;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .otw-landing .feature-card h3 {
          font-size: 19px;
          margin-bottom: 8px;
          color: #5a2c46;
        }

        .otw-landing .feature-card p {
          font-size: 14px;
          line-height: 1.55;
          color: #6b4a5e;
          margin: 0;
          font-weight: 700;
        }

        .otw-landing .feature-card .tag {
          display: inline-block;
          margin-top: 14px;
          background: var(--rosy);
          color: #fff;
          font-size: 10.5px;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }

        @media (max-width: 900px) {
          .otw-landing .feature-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ---- CTA Banner: Full Blossom Bleed ---- */
        .otw-landing .cta-banner {
          background: var(--blossom);
          padding: 80px 28px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .otw-landing .cta-banner h2 {
          font-size: 38px;
          color: var(--rosy-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .otw-landing .cta-banner p {
          color: #6b4a5e;
          font-size: 16px;
          margin: 14px 0 30px;
          font-weight: 800;
        }

        .otw-landing .btn-dark {
          background: var(--rosy);
          color: #fff;
          font-family: var(--font-fredoka), sans-serif;
          font-weight: 700;
          font-size: 18px;
          padding: 20px 40px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 7px 0 var(--rosy-dark);
          display: inline-block;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .otw-landing .btn-dark:active {
          transform: translateY(5px);
          box-shadow: 0 2px 0 var(--rosy-dark);
        }

        /* ---- Footer: Full Teal-dark Bleed ---- */
        .otw-landing footer {
          background: var(--teal-dark);
          padding: 40px 28px 50px;
          text-align: center;
        }

        .otw-landing .footer-logo {
          height: 30px;
          width: auto;
          margin: 0 auto 10px;
          opacity: 0.9;
          filter: brightness(0) invert(1);
          display: block;
          object-fit: contain;
        }

        .otw-landing footer p {
          color: #bfe3ec;
          font-size: 12.5px;
          font-weight: 800;
          margin: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
      `}</style>

      {/* Navigation */}
      <nav>
        <Image
          src="/otw-logo.jpg"
          alt="OTW logo"
          width={120}
          height={44}
          className="logo-img"
          priority
        />
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#get-started">Pricing</a>
        </div>
        <Link className="nav-cta" href="/plan">
          Tara G!
        </Link>
      </nav>

      {/* HERO SECTION: Full Rosy Bleed */}
      <section className="hero">
        <div style={{ position: 'absolute', top: '24px', left: '6%', pointerEvents: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
              fill="rgba(255,255,255,0.4)"
            />
          </svg>
        </div>
        <div style={{ position: 'absolute', top: '70px', right: '14%', pointerEvents: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path
              d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
              fill="rgba(255,255,255,0.3)"
            />
          </svg>
        </div>

        <div className="hero-inner">
          <div>
            <span className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
                  fill="#5a4d10"
                />
              </svg>
              FOR PLANS THAT ACTUALLY HAPPEN
            </span>

            <h1>
              From &quot;G tayo?&quot;
              <br />
              to &quot;OTW na.&quot;
            </h1>

            <p className="lead">
              Finally, a place for all those gala plans na ilang buwan nang nasa group chat. Plan it.
              Share it. Make it happen.
            </p>

            <div className="hero-ctas sparkle-btn-wrap" id="ctaWrap">
              <button className="btn-primary" id="taraBtn" onClick={handleTaraClick}>
                Plan a Gala
              </button>

              <Link className="btn-ghost" href="/join">
                Join a Gala &rarr;
              </Link>

              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className="star-pop"
                  style={
                    {
                      left: s.left,
                      top: s.top,
                      '--tx': s.tx,
                      '--ty': s.ty,
                    } as React.CSSProperties
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
                      fill="#fff"
                    />
                  </svg>
                </span>
              ))}
            </div>

            <p style={{ color: '#ffdcea', fontSize: '12px', marginTop: '12px', fontWeight: 700 }}>
              And yes, we can tell if you&apos;re actually OTW.
            </p>
          </div>

          <div className="hero-mascot">
            <div className="mascot-blob mb1">
              <svg
                width="90"
                height="90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--rosy)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="mascot-blob mb2">
              <strong>Baguio Before Graduation</strong>
              <small>OTW-7K2P • 4 friends G!</small>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION: Full Zest Bleed */}
      <section className="how" id="how">
        <div className="how-inner">
          <h2>Your gala starts here.</h2>
          <p className="how-subtitle">
            NO COMPLICATED SETUP. JUST MAKE A PLAN AND GET EVERYONE MOVING.
          </p>

          <div className="steps">
            <div className="step-blob">
              <div className="num">1</div>
              <h3>G tayo?</h3>
              <p>Pick a date, get the tropa, and give your gala a name your GC will remember.</p>
            </div>

            <div className="step-blob">
              <div className="num">2</div>
              <h3>Okay, what&apos;s the plan?</h3>
              <p>Build the itinerary, sort out the budget, and keep everything in one place.</p>
            </div>

            <div className="step-blob">
              <div className="num">3</div>
              <h3>OTW na ba talaga?</h3>
              <p>Share your location on the day itself. Less &quot;Nasaan ka na?&quot; More &quot;2 mins away.&quot;</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION: Full Teal Bleed with Blossom Blob Cards */}
      <section className="features" id="features">
        <div className="features-inner">
          <div className="section-head">
            <h2>Built for the group chat energy</h2>
            <p>Four things, done well, so nobody has to be &quot;the planner&quot; ever again</p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="icon-blob">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rosy)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
                  <circle cx="12" cy="9" r="2.4" />
                </svg>
              </div>
              <h3>Saan Tayo?</h3>
              <p>Drop a location poll, votes come in live, winner locks the plan.</p>
              <span className="tag">LOCATION POLLS</span>
            </div>

            <div className="feature-card">
              <div className="icon-blob">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rosy)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="7" width="18" height="12" rx="4" />
                  <path d="M3 10.5h18" />
                  <circle cx="16.5" cy="14.5" r="1.3" fill="var(--rosy)" stroke="none" />
                </svg>
              </div>
              <h3>Ambagan</h3>
              <p>Shared costs split and tracked automatically — no group-chat math.</p>
              <span className="tag">SHARED EXPENSES</span>
            </div>

            <div className="feature-card">
              <div className="icon-blob">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rosy)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="3" width="14" height="18" rx="4" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
              </div>
              <h3>Mga Drawing</h3>
              <p>Plans that fell through get shelved, not deleted — revive anytime.</p>
              <span className="tag">SHELVED PLANS</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER: Full Blossom Bleed */}
      <section className="cta-banner">
        <div style={{ position: 'absolute', top: '24px', right: '12%', pointerEvents: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
              fill="#e0417c"
            />
          </svg>
        </div>

        <h2 id="get-started">
          Your next gala is one tap away
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--rosy-dark)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ verticalAlign: '-4px', marginLeft: '4px' }}
          >
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
            <circle cx="12" cy="12" r="3" fill="var(--rosy-dark)" stroke="none" />
          </svg>
        </h2>
        <p>Free to start. Zero planning skills required.</p>
        <Link className="btn-dark" href="/plan">
          Tara G! — It&apos;s Free
        </Link>
      </section>

      {/* FOOTER: Full Teal-dark Bleed */}
      <footer>
        <Image
          src="/otw-logo.jpg"
          alt="OTW logo"
          width={90}
          height={30}
          className="footer-logo"
        />
        <p>
          On The Way — planning made for people who decide things last minute
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            style={{ verticalAlign: '1px', marginLeft: '2px' }}
          >
            <path
              d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
              fill="#bfe3ec"
            />
          </svg>
        </p>
      </footer>
    </div>
  );
}