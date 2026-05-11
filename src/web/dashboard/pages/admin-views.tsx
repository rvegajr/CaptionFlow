import { useState } from 'react';
import * as api from '../api-client.js';
import { Button } from '../../components/Button.js';
import { FormField, TextInput } from '../../components/FormField.js';
import { AppShell } from '../../components/AppShell.js';
import { PageHeader } from '../../components/PageHeader.js';
import { Card, EmptyState } from '../../components/EmptyState.js';

export function AdminViewsPage({ me }: { me: api.Instructor }) {
  const [ym, setYm] = useState(currentYearMonth());
  const [rows, setRows] = useState<{ day: string; count: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const r = await api.adminViews(ym);
      setRows(r.days);
    } catch (e) {
      setErr(prettyError(String(e)));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  const totalViews = rows ? rows.reduce((sum, r) => sum + r.count, 0) : 0;
  const max = rows && rows.length ? Math.max(...rows.map((r) => r.count)) : 0;

  return (
    <AppShell me={me} current="admin">
      <PageHeader
        title="Institution view counts"
        description="Daily view counts for resources owned by your institution. This view is restricted to instructors with the institution_admin role and a linked institution."
      />

      <Card
        title="Pick a month"
        description="Format: YYYY-MM (e.g. 2026-04). Counts are rolled up daily and never capture personally-identifying information."
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <FormField label="Year-month">
              <TextInput
                value={ym}
                onChange={(e) => setYm(e.currentTarget.value)}
                placeholder="2026-04"
                pattern="\d{4}-\d{2}"
              />
            </FormField>
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load views'}
          </Button>
        </div>
        {err ? (
          <div className="banner banner--error" role="alert" style={{ marginTop: 12 }}>
            <AlertIcon />
            <span>{err}</span>
          </div>
        ) : null}
      </Card>

      {rows !== null ? (
        rows.length === 0 ? (
          <EmptyState
            icon={<ChartIcon />}
            title="No views recorded for that month"
            description="Either the month hasn't started yet, or no captioned resources from your institution were viewed during this period."
          />
        ) : (
          <Card
            title={`${ym} · ${totalViews.toLocaleString()} total views`}
            description="Each bar represents one day. The longest bar is scaled to 100%."
          >
            <div className="bar-chart" role="list" aria-label={`Daily views for ${ym}`}>
              {rows.map((d) => (
                <div className="bar-chart__row" role="listitem" key={d.day}>
                  <div className="bar-chart__label">{d.day}</div>
                  <div className="bar-chart__track">
                    <div
                      className="bar-chart__fill"
                      style={{ width: max ? `${(d.count / max) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="bar-chart__value">{d.count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )
      ) : null}
    </AppShell>
  );
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prettyError(s: string): string {
  if (/403|forbidden/i.test(s)) {
    return "You don't have access to this view. Ask your institution admin to grant you the institution_admin role.";
  }
  return s;
}

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
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
