import { useEffect, useState } from 'react';
import { LandingPage } from './pages/landing.js';
import { LoginPage } from './pages/login.js';
import { CaptionsListPage } from './pages/captions-list.js';
import { UploadPage } from './pages/upload.js';
import { ResourcesListPage } from './pages/resources-list.js';
import { AdminViewsPage } from './pages/admin-views.js';
import { LmsConfigPage } from './pages/lms-config.js';
import * as api from './api-client.js';

function route(): string {
  return window.location.hash.replace(/^#/, '') || 'home';
}

export function App() {
  const [hash, setHash] = useState(route());
  const [me, setMe] = useState<api.Instructor | null | undefined>(undefined);

  useEffect(() => {
    const onH = () => setHash(route());
    window.addEventListener('hashchange', onH);
    return () => window.removeEventListener('hashchange', onH);
  }, []);

  useEffect(() => {
    void api.getMe().then(setMe);
  }, [hash]);

  useEffect(() => {
    if (me && !window.location.hash) window.location.hash = 'captions';
  }, [me]);

  if (me === undefined)
    return (
      <div className="auth-shell" role="status" aria-live="polite">
        <p style={{ color: 'var(--app-ink-mute)' }}>Loading CaptionFlow…</p>
      </div>
    );

  if (!me) {
    if (hash === 'login') {
      return <LoginPage onDone={() => void api.getMe().then(setMe)} />;
    }
    return <LandingPage onSignIn={() => (window.location.hash = 'login')} />;
  }

  switch (hash) {
    case 'upload':
      return <UploadPage me={me} />;
    case 'resources':
      return <ResourcesListPage me={me} />;
    case 'admin':
      return <AdminViewsPage me={me} />;
    case 'lms-config':
      return <LmsConfigPage me={me} />;
    case 'captions':
    default:
      return <CaptionsListPage me={me} />;
  }
}
