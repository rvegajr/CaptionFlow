import { useEffect, useState } from 'react';
import * as api from '../api-client.js';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';

export function CaptionsListPage() {
  const [items, setItems] = useState<api.Caption[]>([]);
  const [shareId, setShareId] = useState<string | null>(null);
  const [granteeEmail, setGranteeEmail] = useState('');
  const [tlLang, setTlLang] = useState('ES');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setItems(await api.listCaptions());
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    await api.deleteCaption(id);
    await load();
  }

  async function doShare() {
    if (!shareId) return;
    setErr(null);
    try {
      await api.shareCaption(shareId, granteeEmail);
      setShareId(null);
      setGranteeEmail('');
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="dashboard">
      <h1>Captions</h1>
      <nav className="nav">
        <a href="#captions">Captions</a>
        <a href="#upload">Upload</a>
        <a href="#resources">Resources</a>
        <a href="#admin">Admin views</a>
      </nav>
      <table className="table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Lang</th>
            <th>MT</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.youtubeVideoId}</td>
              <td>{c.languageCode}</td>
              <td>{c.isMachineTranslated ? 'yes' : 'no'}</td>
              <td>
                <Button type="button" onClick={() => remove(c.id)}>
                  Delete
                </Button>{' '}
                <Button type="button" variant="secondary" onClick={() => setShareId(c.id)}>
                  Share
                </Button>
                {!c.isMachineTranslated ? (
                  <>
                    {' '}
                    <TextInput
                      style={{ width: 64, display: 'inline-block' }}
                      value={tlLang}
                      onChange={(e) => setTlLang(e.currentTarget.value)}
                      aria-label="Target language"
                    />{' '}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await api.translateCaption(c.id, tlLang);
                          await load();
                        } catch (e) {
                          setErr(String(e));
                        }
                      }}
                    >
                      Translate
                    </Button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {shareId ? (
        <div style={{ marginTop: '1rem' }}>
          <h2>Share caption</h2>
          <FormField label="Grantee email (must have signed in once)">
            <TextInput value={granteeEmail} onChange={(e) => setGranteeEmail(e.target.value)} />
          </FormField>
          <Button onClick={doShare}>Grant borrow access</Button>
          {err ? <p className="error">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
