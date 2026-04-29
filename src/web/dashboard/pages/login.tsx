import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import * as api from '../api-client.js';

export function LoginPage({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await api.requestMagicLink(email);
      setMsg('Check your email for the sign-in link.');
    } catch (x) {
      setErr(String(x));
    }
  }

  return (
    <div className="dashboard">
      <h1>CaptionFlow</h1>
      <p>Sign in with a magic link (no password).</p>
      <form onSubmit={submit}>
        <FormField label="Email">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            autoComplete="email"
          />
        </FormField>
        <Button type="submit">Send link</Button>
      </form>
      {msg ? <p className="error" style={{ color: 'green' }}>{msg}</p> : null}
      {err ? <p className="error">{err}</p> : null}
      <p style={{ marginTop: '1rem' }}>
        <button type="button" className="button is-secondary" onClick={onDone}>
          I already signed in
        </button>
      </p>
    </div>
  );
}
