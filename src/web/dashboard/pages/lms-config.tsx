import { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell.js';
import { PageHeader } from '../../components/PageHeader.js';
import { Card, EmptyState } from '../../components/EmptyState.js';
import type { Me } from '../api-client.js';

interface LtiPlatform {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksUrl: string;
  deploymentIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface LmsConfigPageProps {
  me: Me;
}

export function LmsConfigPage({ me }: LmsConfigPageProps) {
  const [platforms, setPlatforms] = useState<LtiPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    void loadPlatforms();
  }, []);

  async function loadPlatforms() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/lti/platforms', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { platforms: LtiPlatform[] };
      setPlatforms(data.platforms);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this LMS platform? Existing launches will stop working.')) return;
    try {
      const res = await fetch(`/api/admin/lti/platforms/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      await loadPlatforms();
    } catch (err) {
      alert('Failed to delete platform: ' + String(err));
    }
  }

  if (me.role !== 'institution_admin') {
    return (
      <AppShell me={me}>
        <PageHeader
          title="LMS Configuration"
          description="Access restricted to institution administrators."
        />
        <Card>
          <EmptyState
            icon="🔒"
            title="Access Denied"
            description="You need institution_admin role to manage LTI platform integrations."
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell me={me}>
      <PageHeader
        title="LMS Configuration"
        description="Manage LTI 1.3 platform integrations for Canvas, Blackboard, Moodle, and D2L."
      />

      <Card title="CaptionFlow Tool Configuration">
        <p className="card-hint">
          Provide these URLs to your LMS administrator when registering CaptionFlow as an external
          tool:
        </p>
        <div className="config-grid">
          <ConfigRow label="Tool URL" value={`${baseUrl}/lti/launch`} />
          <ConfigRow label="Login Initiation URL" value={`${baseUrl}/lti/login`} />
          <ConfigRow label="JWKS URL" value={`${baseUrl}/.well-known/jwks`} />
          <ConfigRow label="Redirect URIs" value={`${baseUrl}/lti/launch`} />
          <ConfigRow label="Target Link URI" value={`${baseUrl}/lti/launch`} />
        </div>
      </Card>

      <Card
        title="Registered Platforms"
        actions={
          <button
            type="button"
            className="button is-primary"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
          >
            Register New LMS
          </button>
        }
      >
        {loading && <p>Loading platforms...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && platforms.length === 0 && (
          <EmptyState
            icon="🏫"
            title="No LMS platforms registered"
            description="Register your first Canvas, Blackboard, Moodle, or D2L instance to enable LTI launches."
            action={
              <button
                type="button"
                className="button is-primary"
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                }}
              >
                Register First Platform
              </button>
            }
          />
        )}
        {!loading && !error && platforms.length > 0 && (
          <div className="platforms-list">
            {platforms.map((p) => (
              <div key={p.id} className="platform-card">
                <div className="platform-header">
                  <h3>{p.name}</h3>
                  <div className="platform-actions">
                    <button
                      type="button"
                      className="button is-small is-secondary"
                      onClick={() => {
                        setEditingId(p.id);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button is-small is-danger"
                      onClick={() => void handleDelete(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <dl className="platform-details">
                  <dt>Issuer URL</dt>
                  <dd>{p.issuerUrl}</dd>
                  <dt>Client ID</dt>
                  <dd>{p.clientId}</dd>
                  <dt>Deployment IDs</dt>
                  <dd>{p.deploymentIds.length > 0 ? p.deploymentIds.join(', ') : '(none)'}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <PlatformForm
          platformId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingId(null);
            void loadPlatforms();
          }}
        />
      )}
    </AppShell>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="config-row">
      <label>{label}</label>
      <div className="config-value">
        <code>{value}</code>
        <button type="button" className="button is-small" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

interface PlatformFormProps {
  platformId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function PlatformForm({ platformId, onClose, onSaved }: PlatformFormProps) {
  const [name, setName] = useState('');
  const [issuerUrl, setIssuerUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [authEndpoint, setAuthEndpoint] = useState('');
  const [tokenEndpoint, setTokenEndpoint] = useState('');
  const [jwksUrl, setJwksUrl] = useState('');
  const [deploymentIds, setDeploymentIds] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (platformId) void loadPlatform(platformId);
  }, [platformId]);

  async function loadPlatform(id: string) {
    try {
      const res = await fetch('/api/admin/lti/platforms', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { platforms: LtiPlatform[] };
      const platform = data.platforms.find((p) => p.id === id);
      if (!platform) throw new Error('Platform not found');
      setName(platform.name);
      setIssuerUrl(platform.issuerUrl);
      setClientId(platform.clientId);
      setAuthEndpoint(platform.authEndpoint);
      setTokenEndpoint(platform.tokenEndpoint);
      setJwksUrl(platform.jwksUrl);
      setDeploymentIds(platform.deploymentIds.join(', '));
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body = {
        name,
        issuerUrl,
        clientId,
        authEndpoint,
        tokenEndpoint,
        jwksUrl,
        deploymentIds: deploymentIds.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const url = platformId
        ? `/api/admin/lti/platforms/${platformId}`
        : '/api/admin/lti/platforms';
      const method = platformId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{platformId ? 'Edit Platform' : 'Register New LMS Platform'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <p className="error-message">{error}</p>}
          
          <div className="form-group">
            <label htmlFor="name">
              Platform Name
              <span className="field-hint">e.g., "Canvas Production" or "Blackboard Test"</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="issuerUrl">
              Issuer URL
              <span className="field-hint">Platform's OIDC issuer (from LMS tool registration)</span>
            </label>
            <input
              id="issuerUrl"
              type="url"
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.currentTarget.value)}
              required
              disabled={!!platformId}
            />
          </div>

          <div className="form-group">
            <label htmlFor="clientId">
              Client ID
              <span className="field-hint">Unique identifier assigned by the LMS</span>
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.currentTarget.value)}
              required
              disabled={!!platformId}
            />
          </div>

          <div className="form-group">
            <label htmlFor="authEndpoint">
              Authorization Endpoint
              <span className="field-hint">OIDC authorization URL from LMS</span>
            </label>
            <input
              id="authEndpoint"
              type="url"
              value={authEndpoint}
              onChange={(e) => setAuthEndpoint(e.currentTarget.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenEndpoint">
              Token Endpoint
              <span className="field-hint">OAuth 2.0 token URL from LMS</span>
            </label>
            <input
              id="tokenEndpoint"
              type="url"
              value={tokenEndpoint}
              onChange={(e) => setTokenEndpoint(e.currentTarget.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="jwksUrl">
              JWKS URL
              <span className="field-hint">JSON Web Key Set endpoint for signature verification</span>
            </label>
            <input
              id="jwksUrl"
              type="url"
              value={jwksUrl}
              onChange={(e) => setJwksUrl(e.currentTarget.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deploymentIds">
              Deployment IDs (optional)
              <span className="field-hint">Comma-separated list, leave blank if unsure</span>
            </label>
            <input
              id="deploymentIds"
              type="text"
              value={deploymentIds}
              onChange={(e) => setDeploymentIds(e.currentTarget.value)}
              placeholder="1, 2, 3"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="button is-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button is-primary" disabled={saving}>
              {saving ? 'Saving...' : platformId ? 'Update Platform' : 'Register Platform'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
