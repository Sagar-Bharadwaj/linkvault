import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createLink, deleteLink, getLinks } from '../api.js';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function shorten(text, max = 48) {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    getLinks()
      .then(setLinks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const link = await createLink({
        url,
        alias: alias.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setLinks((prev) => [link, ...prev]);
      setUrl('');
      setAlias('');
      setExpiresAt('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(link) {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(link.code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      window.prompt('Copy this link:', link.shortUrl);
    }
  }

  async function remove(link) {
    if (!window.confirm(`Delete ${link.shortUrl}? Its click history will be removed too.`)) return;
    try {
      await deleteLink(link.code);
      setLinks((prev) => prev.filter((l) => l.code !== link.code));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Shorten a link</h1>
      <form onSubmit={handleSubmit} className="create">
        <label className="full">
          Long URL
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/some/very/long/page"
            required
          />
        </label>
        <label>
          Custom alias (optional)
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="my-link"
            maxLength={30}
          />
        </label>
        <label>
          Expires on (optional)
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
        <div className="full actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create short link'}
          </button>
        </div>
        {error && <p className="error full" role="alert">{error}</p>}
      </form>

      <h2>Your links</h2>
      {loading ? (
        <p className="muted">Loading...</p>
      ) : links.length === 0 ? (
        <p className="muted">You have not created any links yet. Paste a URL above to get started.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Short link</th>
                <th>Original</th>
                <th className="num">Clicks</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.code}>
                  <td>
                    <a href={link.shortUrl} target="_blank" rel="noreferrer">
                      {link.shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </td>
                  <td className="muted" title={link.url}>{shorten(link.url)}</td>
                  <td className="num">{link.clicks}</td>
                  <td>
                    {link.expired ? (
                      <span className="tag expired">Expired</span>
                    ) : link.expiresAt ? (
                      <span className="tag">Until {formatDate(link.expiresAt)}</span>
                    ) : (
                      <span className="tag">Active</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button className="text" onClick={() => copy(link)}>
                      {copied === link.code ? 'Copied' : 'Copy'}
                    </button>
                    <Link to={`/stats/${link.code}`}>Stats</Link>
                    <button className="text danger" onClick={() => remove(link)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
