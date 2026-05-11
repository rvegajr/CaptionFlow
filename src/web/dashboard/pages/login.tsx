import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import { Footer } from '../../components/Footer.js';
import * as api from '../api-client.js';

export function LoginPage({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSubmitting(true);
    try {
      await api.requestMagicLink(email);
      setMsg('Check your inbox — we sent a sign-in link to that address.');
    } catch (x) {
      setErr(String(x));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <a className="auth-card__back" href="#">
          <BackIcon /> Back to home
        </a>
        <a className="auth-card__brand" href="#">
          <span className="app__brand-mark" aria-hidden="true">
            <BrandIcon />
          </span>
          CaptionFlow
        </a>
        <h1>Sign in</h1>
        <p className="auth-card__lede">
          We'll email you a one-time sign-in link. No passwords to remember, and the link is good
          for 15 minutes.
        </p>
        <form onSubmit={submit}>
          <FormField label="Work email">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              autoComplete="email"
              placeholder="you@university.edu"
            />
          </FormField>
          <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </form>
        {msg ? (
          <div className="banner banner--success" role="status" style={{ marginTop: 16 }}>
            <CheckIcon />
            <span>{msg}</span>
          </div>
        ) : null}
        {err ? (
          <div className="banner banner--error" role="alert" style={{ marginTop: 16 }}>
            <AlertIcon />
            <span>{err}</span>
          </div>
        ) : null}
        <p className="auth-card__hint">
          Already clicked your link?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onDone();
            }}
          >
            Refresh status
          </a>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h2M11 12h6M7 15h4" />
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
