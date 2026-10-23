import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchUrls, deleteShortUrl } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadUrls = async () => {
    try {
      setLoading(true);
      const data = await fetchUrls();
      setUrls(data.urls || []);
    } catch {
      toast.error('Failed to load shortened links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUrls();
  }, []);

  const handleCopy = (id, shortUrl) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
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
    } catch {
      toast.error('Failed to delete link');
    } finally {
      setDeletingId(null);
    }
  };

  // Determine badge: EXPIRED, EXPIRING SOON (within 24h), or ACTIVE
  const getBadgeInfo = (item) => {
    if (item.status === 'expired') {
      return { text: 'EXPIRED', className: 'badge-expired' };
    }
    if (item.expiresAt) {
      const msLeft = new Date(item.expiresAt) - new Date();
      const hoursLeft = msLeft / (1000 * 60 * 60);

      if (hoursLeft <= 0) {
        return { text: 'EXPIRED', className: 'badge-expired' };
      }
      if (hoursLeft <= 24) {
        return { text: 'EXPIRING SOON', className: 'badge-expiring' };
      }
    }
    return { text: 'ACTIVE', className: 'badge-active' };
  };

  // Format expiry display text
  const formatExpiryText = (expiresAt) => {
    if (!expiresAt) return 'Never expires';
    const d = new Date(expiresAt);
    return `Expires: ${d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  };

  // Client-side filtering & sorting
  const filteredAndSortedUrls = useMemo(() => {
    let result = urls.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        item.shortCode.toLowerCase().includes(q) ||
        item.originalUrl.toLowerCase().includes(q) ||
        (item.shortUrl && item.shortUrl.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'clicks') {
      result.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else {
      // Default: newest first
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [urls, searchQuery, sortBy]);

  return (
    <div className="container">
      {/* Header with Title and Search/Sort controls */}
      <div className="dashboard-header fade-in">
        <div className="dashboard-title-row">
          <div>
            <h1>
              Your <span className="gradient-text">Link Dashboard</span>
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Manage, search, inspect analytics, and monitor status of your shortened URLs.
            </p>
          </div>
          <div className="dashboard-stats-tag">
            Total Links: <strong>{urls.length}</strong>
          </div>
        </div>

        {/* Search & Sort Toolbar */}
        {urls.length > 0 && (
          <div className="dashboard-toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by short code or original URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort links"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="clicks">🔥 Most Clicks</option>
            </select>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="links-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card skeleton-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="skeleton" style={{ width: '45%', height: '24px' }} />
                  <div className="skeleton" style={{ width: '25%', height: '24px', borderRadius: '9999px' }} />
                </div>
                <div className="skeleton skeleton-line" style={{ width: '85%' }} />
                <div className="skeleton skeleton-line" style={{ width: '65%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="skeleton" style={{ width: '40%', height: '16px' }} />
                  <div className="skeleton" style={{ width: '25%', height: '16px' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : urls.length === 0 ? (
        /* Empty State: No links created yet */
        <div className="glass-card empty-state fade-in">
          <div className="empty-icon">✨</div>
          <h3>No short links created yet</h3>
          <p>Create your very first short link and start tracking clicks in real-time!</p>
          <Link to="/" className="btn btn-primary">
            Create First Link ⚡
          </Link>
        </div>
      ) : filteredAndSortedUrls.length === 0 ? (
        /* Empty State: Search filter yielded no results */
        <div className="glass-card empty-state fade-in">
          <div className="empty-icon">🔎</div>
          <h3>No matching links found</h3>
          <p>We couldn't find any links matching "{searchQuery}". Try another keyword.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        /* Cards Grid with Staggered Fade-In */
        <div className="links-grid">
          {filteredAndSortedUrls.map((item, index) => {
            const badge = getBadgeInfo(item);
            const isCopied = copiedId === item._id;

            return (
              <div
                key={item._id}
                className="glass-card link-card fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div>
                  <div className="link-card-top">
                    <a
                      href={item.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link-card-short"
                      title="Open short link"
                    >
                      /{item.shortCode} ↗
                    </a>
                    <span className={`badge ${badge.className}`}>{badge.text}</span>
                  </div>

                  {/* Clickable Full Short URL */}
                  <div className="link-card-full-url">
                    <a href={item.shortUrl} target="_blank" rel="noreferrer">
                      {item.shortUrl}
                    </a>
                  </div>

                  {/* Truncated Destination URL */}
                  <div className="link-card-original" title={item.originalUrl}>
                    {item.originalUrl}
                  </div>
                </div>

                <div>
                  {/* Click Count & Expiry Information */}
                  <div className="link-card-metrics">
                    <span className="expiry-info">
                      ⏳ {formatExpiryText(item.expiresAt)}
                    </span>
                    <span className="clicks-pill">
                      {item.clicks || 0} {(item.clicks || 0) === 1 ? 'click' : 'clicks'}
                    </span>
                  </div>

                  {/* 4 Uniform Single-Line Action Buttons (2x2 on narrow screens) */}
                  <div className="link-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCopy(item._id, item.shortUrl)}
                      title="Copy short URL"
                    >
                      <span>{isCopied ? '✓' : '📋'}</span>
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href={item.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      title="Open in new tab"
                    >
                      <span>🚀</span>
                      <span>Open</span>
                    </a>

                    <Link
                      to={`/analytics/${item._id}`}
                      className="btn btn-secondary"
                      title="View click statistics"
                    >
                      <span>📊</span>
                      <span>Stats</span>
                    </Link>

                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={deletingId === item._id}
                      onClick={() => handleDelete(item._id, item.shortCode)}
                      title="Delete link"
                    >
                      <span>🗑️</span>
                      <span>{deletingId === item._id ? '...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
