import { useEffect, useState } from 'react';
import * as api from '../api-client.js';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';

export function ResourcesListPage() {
  const [items, setItems] = useState<api.CaptionedResource[]>([]);
  const [caps, setCaps] = useState<api.Caption[]>([]);
  const [url, setUrl] = useState('');
  const [capId, setCapId] = useState('');
  const [borrowVid, setBorrowVid] = useState('');
  const [borrowList, setBorrowList] = useState<api.Caption[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setItems(await api.listResources());
    setCaps(await api.listCaptions());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setErr(null);
    try {
      await api.createResource(url, capId || null);
      setUrl('');
      setCapId('');
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
    if (!borrowVid.trim()) return;
    setBorrowList(await api.listBorrowable(borrowVid.trim()));
  }

  return (
    <div className="dashboard">
      <h1>Captioned resources</h1>
      <nav className="nav">
        <a href="#captions">Captions</a>
        <a href="#upload">Upload</a>
        <a href="#resources">Resources</a>
        <a href="#admin">Admin views</a>
      </nav>
      <h2>New resource</h2>
      <FormField label="YouTube URL or ID">
        <TextInput value={url} onChange={(e) => setUrl(e.currentTarget.value)} />
      </FormField>
      <FormField label="Default caption id (optional)">
        <TextInput value={capId} onChange={(e) => setCapId(e.currentTarget.value)} placeholder="uuid" />
      </FormField>
      <Button onClick={create}>Create</Button>
      {err ? <p className="error">{err}</p> : null}
      <h2 style={{ marginTop: '2rem' }}>Borrowable captions (by video id)</h2>
      <FormField label="YouTube video id">
        <TextInput value={borrowVid} onChange={(e) => setBorrowVid(e.currentTarget.value)} />
      </FormField>
      <Button onClick={loadBorrow}>Search grants</Button>
      <ul>
        {borrowList.map((c) => (
          <li key={c.id}>
            {c.id} — {c.languageCode}{' '}
            <Button
              variant="secondary"
              onClick={async () => {
                const fd = new FormData();
                const blob = new Blob([c.contentText], { type: 'text/plain' });
                fd.append('file', blob, `borrow.${c.format}`);
                fd.append('youtube_video_id', c.youtubeVideoId);
                fd.append('language_code', `${c.languageCode}-borrowed`);
                await api.uploadCaption(fd);
                await load();
              }}
            >
              Copy to my library
            </Button>
          </li>
        ))}
      </ul>
      <h2 style={{ marginTop: '2rem' }}>Your resources</h2>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Video</th>
            <th>Default caption</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td style={{ fontSize: '0.75rem' }}>{r.id}</td>
              <td>{r.youtubeVideoId}</td>
              <td>
                <select
                  value={r.defaultCaptionId ?? ''}
                  onChange={(e) => void setDefault(r.id, e.currentTarget.value || null)}
                >
                  <option value="">—</option>
                  {caps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.languageCode} {c.isMachineTranslated ? '(MT)' : ''}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <a href={`/caption-surface.html?resource=${encodeURIComponent(r.id)}`} target="_blank" rel="noreferrer">
                  Open surface
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
