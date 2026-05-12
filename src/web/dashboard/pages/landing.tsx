import { Footer } from '../../components/Footer.js';

export function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="lp">
      <a className="lp__skip" href="#main">
        Skip to content
      </a>

      <nav className="lp__nav" aria-label="Primary">
        <a className="lp__brand" href="/">
          <span className="lp__brand-mark" aria-hidden="true">
            <BrandIcon />
          </span>
          CaptionFlow
        </a>
        <div className="lp__nav-actions">
          <a className="lp__nav-link" href="/test-play/">
            Try sync test
          </a>
          <button type="button" className="lp__nav-link lp__nav-link--primary" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      </nav>

      <main id="main">
        <header className="lp__hero">
          <div>
            <span className="lp__eyebrow">
              <DotIcon /> WCAG 2.1 AA · FERPA-friendly
            </span>
            <h1 className="lp__headline">
              Captions that actually&nbsp;
              <span className="lp__headline-grad">sync</span>, on the YouTube videos you already
              teach with.
            </h1>
            <p className="lp__lede">
              CaptionFlow plays your <strong>instructor-authored</strong> SRT or VTT captions
              perfectly in time with any embedded YouTube video — without re-uploading the video,
              without relying on YouTube's auto-captions, and without breaking accessibility
              compliance.
            </p>
            <div className="lp__cta-row">
              <button type="button" className="lp__btn" onClick={onSignIn}>
                Get started — sign in
                <ArrowRightIcon />
              </button>
              <a className="lp__btn lp__btn--secondary" href="/test-play/">
                Try a quick sync test
              </a>
            </div>
            <ul className="lp__trust" aria-label="Trust signals">
              <li className="lp__trust-item">
                <span className="lp__trust-dot" aria-hidden="true" /> No video re-hosting
              </li>
              <li className="lp__trust-item">
                <span className="lp__trust-dot" aria-hidden="true" /> Shareable direct links
              </li>
              <li className="lp__trust-item">
                <span className="lp__trust-dot" aria-hidden="true" /> Bring your own SRT / VTT
              </li>
            </ul>
          </div>

          <div className="lp__demo" aria-hidden="true">
            <div className="lp__demo-titlebar">
              <span className="lp__demo-dot" />
              <span className="lp__demo-dot" />
              <span className="lp__demo-dot" />
              <span className="lp__demo-url">captionflow.link/play/lecture-3</span>
            </div>
            <div className="lp__demo-video">
              <span className="lp__demo-play">
                <PlayIcon />
              </span>
              <span className="lp__demo-tape" />
            </div>
            <div className="lp__demo-caption">
              <div className="lp__demo-caption-line">
                <span>Welcome to lecture three.</span>
                <span>Today we'll cover signal processing.</span>
                <span>Notice the waveform on screen.</span>
                <span>It illustrates Nyquist's theorem.</span>
              </div>
              <div className="lp__demo-caption-meta">
                <span className="lp__demo-pill">
                  <CheckIcon /> Instructor-authored
                </span>
                <span>Synced ±250 ms · WCAG 2.1 AA</span>
              </div>
            </div>
          </div>
        </header>

        <section className="lp__section" aria-labelledby="problem-heading">
          <div className="lp__section-head">
            <p className="lp__kicker">The problem</p>
            <h2 id="problem-heading" className="lp__section-title">
              YouTube's auto-captions weren't built for your syllabus.
            </h2>
            <p className="lp__section-sub">
              Instructors embed videos they don't own — and YouTube no longer offers a practical
              way for a third party to fix the captions. Auto-generated tracks aren't legally
              defensible for accessibility, and re-uploading isn't an option.
            </p>
          </div>
          <div className="lp__problem-grid">
            <article className="lp__problem-card">
              <span className="lp__problem-icon" aria-hidden="true">
                <AlertIcon />
              </span>
              <h3>Auto-captions fail accessibility</h3>
              <p>
                YouTube's machine captions are inaccurate, miss speakers, and aren't accepted as
                WCAG 2.1 AA compliant. Disability services know it. Your students do too.
              </p>
            </article>
            <article className="lp__problem-card">
              <span className="lp__problem-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <h3>You can't fix what you don't own</h3>
              <p>
                There's no third-party path to correct captions on someone else's YouTube video.
                Community Contributions shut down years ago. Instructors are stuck.
              </p>
            </article>
            <article className="lp__problem-card">
              <span className="lp__problem-icon" aria-hidden="true">
                <DollarIcon />
              </span>
              <h3>Re-uploading isn't realistic</h3>
              <p>
                Mirroring a third party's video creates copyright exposure, blows up storage costs,
                and breaks the link your students already have in the LMS.
              </p>
            </article>
          </div>
        </section>

        <section
          className="lp__section lp__section--alt"
          aria-labelledby="how-heading"
        >
          <div className="lp__container">
            <div className="lp__section-head">
              <p className="lp__kicker">How it works</p>
              <h2 id="how-heading" className="lp__section-title">
                Three steps. No re-encoding. No video relay.
              </h2>
              <p className="lp__section-sub">
                Bring captions you already trust — or write them once and reuse across every class.
              </p>
            </div>
            <ol className="lp__steps" aria-label="Steps to use CaptionFlow">
              <li className="lp__step">
                <h3>Upload your captions</h3>
                <p>
                  Drop in any standards-compliant <code>.srt</code> or <code>.vtt</code> file.
                  CaptionFlow validates the cues before saving.
                </p>
              </li>
              <li className="lp__step">
                <h3>Pair with a YouTube video</h3>
                <p>
                  Paste the YouTube URL or video ID. We embed the player exactly as students
                  expect; nothing is re-hosted.
                </p>
              </li>
              <li className="lp__step">
                <h3>Share with students</h3>
                <p>
                  Copy a direct link and paste it into any course page, assignment, or announcement.
                  Captions stay locked in sync, even on pause and seek.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="lp__section" aria-labelledby="features-heading">
          <div className="lp__section-head">
            <p className="lp__kicker">What you get</p>
            <h2 id="features-heading" className="lp__section-title">
              Built for the realities of higher-ed media.
            </h2>
            <p className="lp__section-sub">
              Every feature is tied to something instructors and accessibility offices actually
              ask for — nothing more, nothing less.
            </p>
          </div>
          <div className="lp__features-grid">
            <Feature
              icon={<AccessibilityIcon />}
              title="WCAG 2.1 AA by default"
              body="Real text, keyboard-operable controls, reader-friendly contrast, and machine-translated tracks are explicitly disclosed — never passed off as compliant."
            />
            <Feature
              icon={<PuzzleIcon />}
              title="Shareable resources"
              body="Every captioned video gets a permanent, shareable link. Copy it into your LMS, email it to students, or embed it anywhere. No re-uploading, no broken links."
            />
            <Feature
              icon={<UploadIcon />}
              title="Bring your own SRT/VTT"
              body="Open formats, no lock-in. Replace, remove, or version captions any time. Files are validated before they go live."
            />
            <Feature
              icon={<UsersIcon />}
              title="Borrow & share"
              body="Grant a colleague access to a caption you authored. They get the same synced playback for the same YouTube video — without re-uploading anything."
            />
            <Feature
              icon={<GlobeIcon />}
              title="Translate, transparently"
              body="Generate machine-translated tracks (DeepL → Google) alongside your source. They're labelled clearly and never replace the human-authored track."
            />
            <Feature
              icon={<ShieldIcon />}
              title="Privacy-first by design"
              body="We never proxy video bytes — they flow straight from YouTube to the viewer. Storage per video is kilobytes of caption text. No surveillance built in."
            />
          </div>
        </section>

        <section
          className="lp__section lp__section--alt"
          aria-labelledby="who-heading"
        >
          <div className="lp__container">
            <div className="lp__section-head">
              <p className="lp__kicker">Who uses it</p>
              <h2 id="who-heading" className="lp__section-title">
                Anywhere a YouTube embed shows up in a course.
              </h2>
              <p className="lp__section-sub">
                CaptionFlow fits the workflow you already have — it just makes the captions work.
              </p>
            </div>
            <div className="lp__personas">
              <article className="lp__persona">
                <span className="lp__persona-tag">Faculty</span>
                <h3>Lectures, labs, and flipped classrooms</h3>
                <p>
                  Embed the same supplemental YouTube clip you've taught with for years — only
                  this time the captions are correct, citation-grade, and ready before the
                  semester starts.
                </p>
              </article>
              <article className="lp__persona">
                <span className="lp__persona-tag">Accessibility office</span>
                <h3>Defensible captioning at scale</h3>
                <p>
                  Provide a single tool faculty can adopt instead of one-off captioning vendors.
                  Every track is human-authored or clearly disclosed as machine-translated.
                </p>
              </article>
              <article className="lp__persona">
                <span className="lp__persona-tag">Instructional design</span>
                <h3>Course modules and OERs</h3>
                <p>
                  Add captioned video segments into any module. Reuse caption assets across
                  semesters. Roll out via LTI in minutes, not weeks.
                </p>
              </article>
              <article className="lp__persona">
                <span className="lp__persona-tag">Language programs</span>
                <h3>Multilingual sections</h3>
                <p>
                  Pair an instructor-authored source track with translated tracks for ESL,
                  immersion, and study-abroad programs — labelled, never misrepresented.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="lp__section" aria-labelledby="cta-heading">
          <div className="lp__cta-card">
            <h2 id="cta-heading">Ready to make every embedded video class-ready?</h2>
            <p>
              Sign in to start authoring captions, or kick the tires with a no-account sync test
              first.
            </p>
            <div className="lp__cta-row" style={{ justifyContent: 'center' }}>
              <button type="button" className="lp__btn" onClick={onSignIn}>
                Sign in to your dashboard
                <ArrowRightIcon />
              </button>
              <a className="lp__btn lp__btn--secondary" href="/test-play/">
                Try the sync test
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* Sub-components -------------------------------------------------------- */

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="lp__feature">
      <span className="lp__feature-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

/* Inline icons (no external dependencies) ------------------------------ */

function BrandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h2M11 12h6M7 15h4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function AccessibilityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4" r="2" />
      <path d="M19 8H5M12 6v8M9 14l-2 7M15 14l2 7" />
    </svg>
  );
}

function PuzzleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.5 12c1.4 0 2.5-1.1 2.5-2.5S20.9 7 19.5 7H17V4.5C17 3.1 15.9 2 14.5 2S12 3.1 12 4.5V7H9.5C8.1 7 7 8.1 7 9.5S8.1 12 9.5 12H12v2.5c0 1.4-1.1 2.5-2.5 2.5S7 15.9 7 14.5V12H4.5C3.1 12 2 13.1 2 14.5S3.1 17 4.5 17H7v2.5C7 20.9 8.1 22 9.5 22s2.5-1.1 2.5-2.5V17h2.5c1.4 0 2.5-1.1 2.5-2.5S15.9 12 14.5 12H17V9.5C17 8.1 18.1 7 19.5 7" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
