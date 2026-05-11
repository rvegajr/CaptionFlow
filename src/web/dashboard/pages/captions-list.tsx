import { useEffect, useState } from 'react';
import * as api from '../api-client.js';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import { AppShell } from '../../components/AppShell.js';
import { PageHeader } from '../../components/PageHeader.js';
import { EmptyState, Card } from '../../components/EmptyState.js';

export function CaptionsListPage({ me }: { me: api.Instructor }) {
  const [items, setItems] = useState<api.Caption[] | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [granteeEmail, setGranteeEmail] = useState('');
  const [tlLang, setTlLang] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setItems(await api.listCaptions());
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm('Delete this caption track? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api.deleteCaption(id);
      setMsg('Caption deleted.');
      await load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function doShare() {
    if (!shareId) return;
    setErr(null);
    setMsg(null);
    try {
      await api.shareCaption(shareId, granteeEmail);
      setShareId(null);
      setGranteeEmail('');
      setMsg(`Caption shared with ${granteeEmail}.`);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function doTranslate(c: api.Caption) {
    const target = (tlLang[c.id] ?? 'ES').toUpperCase();
    setBusyId(c.id);
    setErr(null);
    try {
      await api.translateCaption(c.id, target);
      setMsg(`Generated ${target} translation.`);
      await load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell me={me} current="captions">
      <PageHeader
        title="Captions"
        description="Every caption track you've uploaded or generated. Attach one to a video resource to publish it to viewers."
        actions={
          <a className="button" href="#upload">
            <PlusIcon /> Upload caption
          </a>
        }
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

      {items === null ? (
        <p style={{ color: 'var(--app-ink-mute)' }}>Loading captions…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CaptionsIcon />}
          title="No captions yet"
          description="Upload an SRT or VTT file to create your first caption track. We'll validate it and pair it with the YouTube video you choose."
          action={
            <a className="button" href="#upload">
              <PlusIcon /> Upload your first caption
            </a>
          }
        />
      ) : (
        <Card
          title={`${items.length} caption${items.length === 1 ? '' : 's'} in your library`}
          description="Click Share to grant a colleague access, or Translate to generate a machine-translated track that's clearly labelled."
          className="card--flush"
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Language</th>
                  <th>Type</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="video-cell">
                        <span
                          className="video-cell__thumb"
                          style={{
                            backgroundImage: `url(https://i.ytimg.com/vi/${encodeURIComponent(
                              c.youtubeVideoId,
                            )}/mqdefault.jpg)`,
                          }}
                        />
                        {c.youtubeVideoId}
                      </span>
                    </td>
                    <td>
                      <span className="pill pill--neutral">{c.languageCode.toUpperCase()}</span>
                    </td>
                    <td>
                      {c.isMachineTranslated ? (
                        <span className="pill pill--warning" title="Not certified for accessibility compliance">
                          Machine-translated
                        </span>
                      ) : (
                        <span className="pill pill--success">Instructor-authored</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--app-ink-mute)', fontSize: '0.85rem' }}>
                      {formatDate(c.updatedAt)}
                    </td>
                    <td>
                      <div className="table-actions">
                        {!c.isMachineTranslated ? (
                          <>
                            <input
                              className="input-inline"
                              style={{
                                width: 60,
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--app-divider)',
                                background: 'var(--app-surface)',
                                color: 'var(--app-ink)',
                                fontSize: '0.82rem',
                                textTransform: 'uppercase',
                              }}
                              value={tlLang[c.id] ?? 'ES'}
                              onChange={(e) =>
                                setTlLang((m) => ({ ...m, [c.id]: e.currentTarget.value }))
                              }
                              aria-label={`Target language for ${c.youtubeVideoId}`}
                            />
                            <Button
                              variant="secondary"
                              className="is-sm"
                              onClick={() => doTranslate(c)}
                              disabled={busyId === c.id}
                            >
                              Translate
                            </Button>
                          </>
                        ) : null}
                        <Button
                          variant="secondary"
                          className="is-sm"
                          onClick={() => setShareId(c.id)}
                        >
                          Share
                        </Button>
                        <Button
                          variant="secondary"
                          className="is-sm is-danger"
                          onClick={() => remove(c.id)}
                          disabled={busyId === c.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {shareId ? (
        <Card
          title="Share caption with a colleague"
          description="They'll receive borrow access and can copy the caption into their own library. They must have signed in to CaptionFlow at least once."
        >
          <FormField label="Colleague's email">
            <TextInput
              type="email"
              value={granteeEmail}
              onChange={(e) => setGranteeEmail(e.target.value)}
              placeholder="colleague@university.edu"
            />
          </FormField>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={doShare}>Grant borrow access</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShareId(null);
                setGranteeEmail('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CaptionsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h3M13 12h4M7 15h6" />
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
