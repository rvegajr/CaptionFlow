export interface Caption {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  format: 'srt' | 'vtt';
  languageCode: string;
  contentText: string;
  isMachineTranslated: boolean;
  sourceCaptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaptionedResource {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  defaultCaptionId: string | null;
  ltiResourceLinkId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Instructor {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function requestMagicLink(email: string): Promise<void> {
  const res = await fetch('/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getMe(): Promise<Instructor | null> {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (res.status === 401) return null;
  return json<Instructor>(res);
}

export async function listCaptions(): Promise<Caption[]> {
  const res = await fetch('/api/captions', { credentials: 'include' });
  return json<Caption[]>(res);
}

export async function deleteCaption(id: string): Promise<void> {
  const res = await fetch(`/api/captions/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

export async function uploadCaption(fd: FormData): Promise<Caption> {
  const res = await fetch('/api/captions', { method: 'POST', credentials: 'include', body: fd });
  return json<Caption>(res);
}

export async function listResources(): Promise<CaptionedResource[]> {
  const res = await fetch('/api/resources', { credentials: 'include' });
  return json<CaptionedResource[]>(res);
}

export async function createResource(youtubeUrl: string, defaultCaptionId: string | null): Promise<CaptionedResource> {
  const res = await fetch('/api/resources', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl, defaultCaptionId }),
  });
  return json<CaptionedResource>(res);
}

export async function updateResourceDefault(id: string, defaultCaptionId: string | null): Promise<CaptionedResource> {
  const res = await fetch(`/api/resources/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ defaultCaptionId }),
  });
  return json<CaptionedResource>(res);
}

export async function shareCaption(captionId: string, granteeEmail: string): Promise<void> {
  const res = await fetch(`/api/captions/${captionId}/share`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ granteeEmail }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function listBorrowable(youtubeVideoId: string): Promise<Caption[]> {
  const res = await fetch(`/api/captions/borrow/${encodeURIComponent(youtubeVideoId)}`, {
    credentials: 'include',
  });
  return json<Caption[]>(res);
}

export async function translateCaption(captionId: string, targetLang: string): Promise<Caption> {
  const res = await fetch(`/api/captions/${captionId}/translate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetLang }),
  });
  return json<Caption>(res);
}

export async function adminViews(yearMonth: string): Promise<{
  institutionId: string;
  yearMonth: string;
  days: { day: string; count: number }[];
}> {
  const res = await fetch(`/api/admin/views/${encodeURIComponent(yearMonth)}`, { credentials: 'include' });
  return json(res);
}
