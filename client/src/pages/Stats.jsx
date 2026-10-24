import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStats } from '../api.js';

function Breakdown({ title, rows }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <section>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted small">No data yet.</p>
      ) : (
        <ul className="breakdown">
          {rows.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <span className="muted">{r.count} ({Math.round((r.count / total) * 100)}%)</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats(code).then(setData).catch((err) => setError(err.message));
  }, [code]);

  if (error) {
    return (
      <div className="empty">
        <h1>{error}</h1>
        <Link to="/">Back to your links</Link>
      </div>
    );
  }
  if (!data) return <p className="muted">Loading...</p>;

  const { link, daily, referrers, browsers, devices } = data;
  const max = Math.max(1, ...daily.map((d) => d.count));
  const last14 = daily.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <p className="back"><Link to="/">Back to your links</Link></p>
      <h1>{link.shortUrl.replace(/^https?:\/\//, '')}</h1>
      <p className="muted dest">Redirects to {link.url}</p>
      <p>
        <strong>{link.clicks}</strong> total clicks, <strong>{last14}</strong> in the last 14 days.
        {link.expired && ' This link has expired.'}
        {!link.expired && link.expiresAt && ` Expires ${new Date(link.expiresAt).toLocaleString()}.`}
      </p>

      <h2>Clicks per day</h2>
      <div className="chart" role="img" aria-label="Bar chart of clicks per day for the last 14 days">
        {daily.map((d) => (
          <div className="bar-col" key={d.date} title={`${d.date}: ${d.count}`}>
            <span className="bar-count">{d.count || ''}</span>
            <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="bar-label">{d.date.slice(8)}</span>
          </div>
        ))}
      </div>
      <p className="muted small">Days are in UTC.</p>

      <div className="breakdowns">
        <Breakdown title="Top referrers" rows={referrers} />
        <Breakdown title="Browsers" rows={browsers} />
        <Breakdown title="Devices" rows={devices} />
      </div>
    </>
  );
}
