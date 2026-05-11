import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import { AppShell } from '../../components/AppShell.js';
import { PageHeader } from '../../components/PageHeader.js';
import { Card } from '../../components/EmptyState.js';
import * as api from '../api-client.js';

export function UploadPage({ me }: { me: api.Instructor }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lang, setLang] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<api.Caption | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!file) {
      setErr('Choose a .srt or .vtt file to upload.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('youtube_video_id', youtubeUrl.trim());
    fd.append('language_code', lang);
    setSubmitting(true);
    try {
      const cap = await api.uploadCaption(fd);
      setResult(cap);
      setFile(null);
      const fileEl = document.getElementById('upload-file') as HTMLInputElement | null;
      if (fileEl) fileEl.value = '';
    } catch (x) {
      setErr(prettyError(String(x)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell me={me} current="upload">
      <PageHeader
        title="Upload caption"
        description="Add a new caption track. We validate cue formatting before saving and never modify your file. Once uploaded, you can attach it to a captioned resource for viewers."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}
           className="upload-grid">
        <Card title="Caption details" description="Tell us which video this caption is for and what language it's written in.">
          <form onSubmit={submit}>
            <FormField label="YouTube URL or video ID">
              <TextInput
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.currentTarget.value)}
                required
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                autoComplete="off"
              />
            </FormField>
            <p className="field-hint">
              Paste the share link or just the 11-character video ID. Both work.
            </p>

            <div className="field-row" style={{ marginTop: 16 }}>
              <FormField label="Language code">
                <TextInput
                  value={lang}
                  onChange={(e) => setLang(e.currentTarget.value)}
                  placeholder="en"
                  autoComplete="off"
                  maxLength={10}
                  pattern="[a-zA-Z-]+"
                />
              </FormField>
              <FormField label="Caption file (.srt or .vtt)">
                <input
                  id="upload-file"
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                />
              </FormField>
            </div>
            <p className="field-hint">
              Use ISO 639-1 codes like <code>en</code>, <code>es</code>, <code>fr</code>, or
              regional variants like <code>en-US</code>. Files larger than 1 MB are rejected.
            </p>

            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Uploading…' : 'Upload'}
              </Button>
              <a className="button is-secondary" href="#captions">
                Cancel
              </a>
            </div>

            {err ? (
              <div className="banner banner--error" role="alert" style={{ marginTop: 16 }}>
                <AlertIcon />
                <span>{err}</span>
              </div>
            ) : null}
            {result ? (
              <div className="banner banner--success" role="status" style={{ marginTop: 16 }}>
                <CheckIcon />
                <div>
                  <strong>Caption uploaded.</strong> It's now in your library — visit{' '}
                  <a href="#captions">Captions</a> to share or translate it, or{' '}
                  <a href="#resources">Resources</a> to attach it to a viewing surface.
                </div>
              </div>
            ) : null}
          </form>
        </Card>

        <Card title="How uploading works">
          <ol className="howto" style={{ display: 'block', padding: 0, margin: 0, listStyle: 'none' }}>
            <Step n={1} title="Paste the YouTube URL">
              We never re-host or proxy the video — only the caption file is stored.
            </Step>
            <Step n={2} title="Pick a language code">
              ISO 639-1 like <code>en</code>, <code>es</code>, <code>fr</code>. Add a region
              suffix (<code>en-US</code>) to disambiguate.
            </Step>
            <Step n={3} title="Choose your SRT or VTT">
              We parse the cues, validate timing, and reject anything malformed.
            </Step>
            <Step n={4} title="Attach it to a resource">
              Head to <a href="#resources">Resources</a> to publish a viewer-friendly link or LTI
              launch.
            </Step>
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 14 }}>
      <div className="howto__step">
        <span className="howto__step-num">{n}</span>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </li>
  );
}

function prettyError(s: string): string {
  if (/413|too large/i.test(s)) return 'File is too large. Caption files must be under 1 MB.';
  if (/422|invalid/i.test(s)) return 'That file does not parse as valid SRT or VTT.';
  return s.replace(/^Error:\s*/i, '');
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
