import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchUrls, deleteShortUrl } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadUrls = async () => {
    try {
      setLoading(true);
      const data = await fetchUrls();
      setUrls(data.urls || []);
    } catch (err) {
      toast.error('Failed to load shortened links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUrls();
  }, []);

  const handleCopy = (shortUrl) => {
    navigator.clipboard.writeText(shortUrl);
    toast.success('Copied!');
  };

  const handleDelete = async (id, shortCode) => {
    if (!window.confirm(`Are you sure you want to delete link "/${shortCode}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteShortUrl(id);
      toast.success('Link deleted successfully');
      setUrls((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      toast.error('Failed to delete link');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header fade-in">
        <div>
          <h1>
            Your <span className="gradient-text">Link Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Manage, inspect analytics, and monitor status of your shortened URLs.
          </p>
        </div>
        <div className="dashboard-stats-tag">
          Total Links: <strong>{urls.length}</strong>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div className="spinner" />
        </div>
      ) : urls.length === 0 ? (
        <div className="glass-card empty-state fade-in">
          <div className="empty-icon">🔗</div>
          <h3>No short links created yet</h3>
          <p>Create your very first short link and start tracking clicks in real-time!</p>
          <Link to="/" className="btn btn-primary">
            Create First Link ⚡
          </Link>
        </div>
      ) : (
        <div className="links-grid fade-in">
          {urls.map((item) => (
            <div key={item._id} className="glass-card link-card">
              <div>
                <div className="link-card-top">
                  <a
                    href={item.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="link-card-short"
                  >
                    /{item.shortCode}
                  </a>
                  <span
                    className={`badge ${
                      item.status === 'expired' ? 'badge-expired' : 'badge-active'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="link-card-original" title={item.originalUrl}>
                  {item.originalUrl}
                </div>
              </div>

              <div>
                <div className="link-card-metrics">
                  <span>
                    Created:{' '}
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="clicks-pill">
                    {item.clicks} {item.clicks === 1 ? 'click' : 'clicks'}
                  </span>
                </div>

                <div className="link-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCopy(item.shortUrl)}
                  >
                    📋 Copy
                  </button>
                  <Link
                    to={`/analytics/${item._id}`}
                    className="btn btn-secondary"
                  >
                    📊 Analytics
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={deletingId === item._id}
                    onClick={() => handleDelete(item._id, item.shortCode)}
                  >
                    {deletingId === item._id ? '...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
