import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import * as api from '../api-client.js';

export function UploadPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lang, setLang] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!file) {
      setErr('Choose a .srt or .vtt file');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('youtube_video_id', youtubeUrl.trim());
    fd.append('language_code', lang);
    try {
      const cap = await api.uploadCaption(fd);
      setMsg(`Uploaded caption ${cap.id}`);
    } catch (x) {
      setErr(String(x));
    }
  }

  return (
    <div className="dashboard">
      <h1>Upload caption</h1>
      <nav className="nav">
        <a href="#captions">Captions</a>
        <a href="#upload">Upload</a>
        <a href="#resources">Resources</a>
        <a href="#admin">Admin views</a>
      </nav>
      <form onSubmit={submit}>
        <FormField label="YouTube URL or video ID">
          <TextInput value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.currentTarget.value)} required />
        </FormField>
        <FormField label="Language code">
          <TextInput value={lang} onChange={(e) => setLang(e.currentTarget.value)} />
        </FormField>
        <FormField label="Caption file (.srt / .vtt)">
          <input
            type="file"
            accept=".srt,.vtt"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          />
        </FormField>
        <Button type="submit">Upload</Button>
      </form>
      {msg ? <p>{msg}</p> : null}
      {err ? <p className="error">{err}</p> : null}
    </div>
  );
}
