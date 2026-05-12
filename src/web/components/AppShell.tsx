import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as api from '../dashboard/api-client.js';
import { Footer } from './Footer.js';

type Route = 'captions' | 'upload' | 'resources' | 'admin' | 'lms-config';

function buildNav(role: string): ReadonlyArray<{ id: Route; label: string; href: string; icon: ReactNode }> {
  const base = [
    { id: 'captions' as const, label: 'Captions', href: '#captions', icon: <CaptionsIcon /> },
    { id: 'upload' as const, label: 'Upload', href: '#upload', icon: <UploadIcon /> },
    { id: 'resources' as const, label: 'Resources', href: '#resources', icon: <ResourcesIcon /> },
    { id: 'admin' as const, label: 'Views', href: '#admin', icon: <ChartIcon /> },
  ];
  
  if (role === 'institution_admin') {
    base.push({ id: 'lms-config', label: 'LMS Config', href: '#lms-config', icon: <GearIcon /> });
  }
  
  return base;
}

export function AppShell({
  me,
  current,
  children,
}: {
  me: api.Instructor;
  current: Route;
  children: ReactNode;
}) {
  const NAV = buildNav(me.role);
  return (
    <div className="app">
      <a className="app__skip" href="#main">
        Skip to content
      </a>
      <header className="app__header" role="banner">
        <div className="app__header-inner">
          <a className="app__brand" href="#captions" aria-label="CaptionFlow home">
            <span className="app__brand-mark" aria-hidden="true">
              <BrandIcon />
            </span>
            <span className="app__brand-name">CaptionFlow</span>
          </a>
          <nav className="nav app__nav" aria-label="Primary">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={n.href}
                className={`app__nav-link ${current === n.id ? 'is-active' : ''}`}
                aria-current={current === n.id ? 'page' : undefined}
              >
                <span className="app__nav-icon" aria-hidden="true">
                  {n.icon}
                </span>
                <span>{n.label}</span>
              </a>
            ))}
          </nav>
          <UserMenu me={me} />
        </div>
      </header>
      <main id="main" className="app__main">
        <div className="app__container">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

function UserMenu({ me }: { me: api.Instructor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    setOpen(false);
    try {
      await api.logout();
    } finally {
      window.location.hash = '';
      window.location.reload();
    }
  }

  const initials = (me.displayName ?? me.email)
    .split(/[@\s.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');

  return (
    <div className="app__user" ref={ref}>
      <button
        type="button"
        className="app__user-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="app__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="app__user-email">{me.email}</span>
        <span className="app__user-caret" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>
      {open ? (
        <div className="app__user-menu" role="menu">
          <div className="app__user-info" aria-hidden="true">
            <div className="app__user-info-name">{me.displayName ?? me.email}</div>
            <div className="app__user-info-role">
              {prettyRole(me.role)}
            </div>
          </div>
          <button
            type="button"
            className="app__user-menu-item"
            role="menuitem"
            onClick={signOut}
          >
            <SignOutIcon /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function prettyRole(role: string): string {
  if (role === 'institution_admin') return 'Institution admin';
  if (role === 'instructor') return 'Instructor';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Icons ----------------------------------------------------------------- */

function BrandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h2M11 12h6M7 15h4" />
    </svg>
  );
}

function CaptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h3M13 12h4M7 15h6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function ResourcesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </svg>
  );
}
