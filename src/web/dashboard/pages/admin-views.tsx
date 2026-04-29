import { useState } from 'react';
import * as api from '../api-client.js';

export function AdminViewsPage() {
  const [ym, setYm] = useState('2026-04');
  const [rows, setRows] = useState<{ day: string; count: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const r = await api.adminViews(ym);
      setRows(r.days);
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="dashboard">
      <h1>Institution view counts</h1>
      <nav className="nav">
        <a href="#captions">Captions</a>
        <a href="#upload">Upload</a>
        <a href="#resources">Resources</a>
        <a href="#admin">Admin views</a>
      </nav>
      <p>Requires instructor role <code>institution_admin</code> and linked institution.</p>
      <label>
        Year-month (YYYY-MM){' '}
        <input value={ym} onChange={(e) => setYm(e.currentTarget.value)} />
      </label>{' '}
      <button type="button" className="button" onClick={load}>
        Load
      </button>
      {err ? <p className="error">{err}</p> : null}
      <table className="table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Day</th>
            <th>Views</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
