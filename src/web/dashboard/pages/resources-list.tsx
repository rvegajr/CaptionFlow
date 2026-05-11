import { useEffect, useState } from 'react';
import * as api from '../api-client.js';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import { AppShell } from '../../components/AppShell.js';
import { PageHeader } from '../../components/PageHeader.js';
import { Card, EmptyState } from '../../components/EmptyState.js';

export function ResourcesListPage({ me }: { me: api.Instructor }) {
  const [items, setItems] = useState<api.CaptionedResource[] | null>(null);
  const [caps, setCaps] = useState<api.Caption[]>([]);
  const [url, setUrl] = useState('');
  const [capId, setCapId] = useState('');
  const [borrowVid, setBorrowVid] = useState('');
  const [borrowList, setBorrowList] = useState<api.Caption[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setItems(await api.listResources());
    setCaps(await api.listCaptions());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setErr(null);
    setMsg(null);
    try {
      await api.createResource(url, capId || null);
      setUrl('');
      setCapId('');
      setMsg('Resource created. Pick a default caption track below to publish it.');
      await load();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function setDefault(resId: string, def: string | null) {
    await api.updateResourceDefault(resId, def);
    await load();
  }

  async function loadBorrow() {
    setErr(null);
    if (!borrowVid.trim()) return;
    try {
      setBorrowList(await api.listBorrowable(borrowVid.trim()));
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <AppShell me={me} current="resources">
      <PageHeader
        title="Captioned resources"
        description="A resource pairs a YouTube video with one or more caption tracks. Each resource has a public viewing surface and an LTI-launchable URL."
      />

      {msg ? (
        <div className="banner banner--success" role="status">
          <CheckIcon />
          <span>{msg}</span>
        </div>
      ) : null}
      {err ? (
        <div className="banner banner--error" role="alert">
          <AlertIcon />
          <span>{err}</span>
        </div>
      ) : null}

      <Card
        title="Create a new resource"
        description="Paste a YouTube URL or video ID. You can pick the default caption now or later."
      >
        <FormField label="YouTube URL or ID">
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </FormField>
        <FormField label="Default caption (optional)">
          <select
            id="resource-default-caption"
            value={capId}
            onChange={(e) => setCapId(e.currentTarget.value)}
          >
            <option value="">— None for now</option>
            {caps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.youtubeVideoId} · {c.languageCode.toUpperCase()}{' '}
                {c.isMachineTranslated ? '(machine-translated)' : ''}
              </option>
            ))}
          </select>
        </FormField>
        <Button onClick={create}>Create</Button>
      </Card>

      <Card
        title="Your resources"
        description="Pick a default caption track for each resource. Click Open surface to preview the synced view."
        className="card--flush"
      >
        {items === null ? (
          <p style={{ padding: 24, color: 'var(--app-ink-mute)' }}>Loading resources…</p>
        ) : items.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={<ResourcesIcon />}
              title="No resources yet"
              description="Create a captioned resource above by pasting any YouTube URL. You can attach an existing caption track or upload one first."
              action={
                <a className="button is-secondary" href="#upload">
                  Upload a caption first
                </a>
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Default caption</th>
                  <th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="video-cell">
                        <span
                          className="video-cell__thumb"
                          style={{
                            backgroundImage: `url(https://i.ytimg.com/vi/${encodeURIComponent(
                              r.youtubeVideoId,
                            )}/mqdefault.jpg)`,
                          }}
                        />
                        {r.youtubeVideoId}
                      </span>
                    </td>
                    <td>
                      <select
                        value={r.defaultCaptionId ?? ''}
                        onChange={(e) =>
                          void setDefault(r.id, e.currentTarget.value || null)
                        }
                        aria-label={`Default caption for ${r.youtubeVideoId}`}
                      >
                        <option value="">—</option>
                        {caps
                          .filter((c) => c.youtubeVideoId === r.youtubeVideoId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.languageCode.toUpperCase()}{' '}
                              {c.isMachineTranslated ? '(MT)' : ''}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <a
                        className="button is-secondary is-sm"
                        href={`/caption-surface.html?resource=${encodeURIComponent(r.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open surface
                        <ExternalLinkIcon />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Borrow captions from colleagues"
        description="If a colleague has shared a caption track for the same YouTube video, you can copy it into your library here."
      >
        <FormField label="YouTube video ID to search">
          <TextInput
            value={borrowVid}
            onChange={(e) => setBorrowVid(e.currentTarget.value)}
            placeholder="e.g. dQw4w9WgXcQ"
          />
        </FormField>
        <Button onClick={loadBorrow} variant="secondary">
          <SearchIcon /> Search shared captions
        </Button>

        {borrowList !== null ? (
          borrowList.length === 0 ? (
            <p style={{ marginTop: 16, color: 'var(--app-ink-mute)' }}>
              No shared captions found for that video.
            </p>
          ) : (
            <ul className="list-clean" style={{ marginTop: 16 }}>
              {borrowList.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{c.languageCode.toUpperCase()}</strong>{' '}
                    {c.isMachineTranslated ? (
                      <span className="pill pill--warning">MT</span>
                    ) : (
                      <span className="pill pill--success">Instructor</span>
                    )}{' '}
                    <code>{c.id.slice(0, 8)}…</code>
                  </span>
                  <Button
                    variant="secondary"
                    className="is-sm"
                    onClick={async () => {
                      const fd = new FormData();
                      const blob = new Blob([c.contentText], { type: 'text/plain' });
                      fd.append('file', blob, `borrow.${c.format}`);
                      fd.append('youtube_video_id', c.youtubeVideoId);
                      fd.append('language_code', `${c.languageCode}-borrowed`);
                      try {
                        await api.uploadCaption(fd);
                        setMsg('Caption copied into your library.');
                        await load();
                      } catch (e) {
                        setErr(String(e));
                      }
                    }}
                  >
                    Copy to my library
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Card>
    </AppShell>
  );
}

function ResourcesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
