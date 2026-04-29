import { createRoot } from 'react-dom/client';
import { CaptionSurface } from './CaptionSurface.js';

const params = new URLSearchParams(window.location.search);
const resourceId = params.get('resource');
const rootEl = document.getElementById('root');
if (!resourceId || !rootEl) {
  if (rootEl) rootEl.textContent = 'Missing ?resource= UUID';
} else {
  createRoot(rootEl).render(<CaptionSurface resourceId={resourceId} />);
}
