import { useEffect, useState } from 'react';
import { LoginPage } from './pages/login.js';
import { CaptionsListPage } from './pages/captions-list.js';
import { UploadPage } from './pages/upload.js';
import { ResourcesListPage } from './pages/resources-list.js';
import { AdminViewsPage } from './pages/admin-views.js';
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

  if (me === undefined) return <div className="dashboard">Loading…</div>;

  if (!me) {
    return <LoginPage onDone={() => void api.getMe().then(setMe)} />;
  }

  switch (hash) {
    case 'upload':
      return <UploadPage />;
    case 'resources':
      return <ResourcesListPage />;
    case 'admin':
      return <AdminViewsPage />;
    case 'captions':
    default:
      return <CaptionsListPage />;
  }
}
