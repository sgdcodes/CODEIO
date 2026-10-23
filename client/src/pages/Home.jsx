import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createShortUrl, fetchUrls } from '../api/client';
import './Home.css';

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Global platform stats computed from existing GET /api/urls
  const [platformStats, setPlatformStats] = useState({ totalLinks: 0, totalClicks: 0 });

  const loadStats = async () => {
    try {
      const data = await fetchUrls();
      if (data?.urls) {
        const totalClicks = data.urls.reduce((acc, u) => acc + (u.clicks || 0), 0);
        setPlatformStats({
          totalLinks: data.urls.length,
          totalClicks,
        });
      }
    } catch {
      // Graceful fallback if offline or backend cold start
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!originalUrl.trim()) {
      toast.error('Please enter a destination URL');
      return;
    }

    try {
      setLoading(true);
      const data = await createShortUrl({
        originalUrl,
        customAlias,
        expiresInDays,
      });

      setResult(data);
      toast.success('Short link generated successfully!');
      // Reset inputs & refresh platform stats
      setOriginalUrl('');
      setCustomAlias('');
      setExpiresInDays('');
      loadStats();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to shorten URL';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard with 2-second temporary "Copied ✓" state
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="home-hero fade-in">
        <h1>
          Shorten Links with <span className="gradient-text">Instant Superpowers</span>
        </h1>
        <p>
          Transform long, cumbersome URLs into clean, lightning-fast short links
          with custom aliases and real-time deep click analytics.
        </p>

        {/* Feature Chips */}
        <div className="feature-chips">
          <span className="feature-chip">
            <span className="chip-dot" /> 100% Free
          </span>
          <span className="feature-chip">
            <span className="chip-dot" /> Click Analytics
          </span>
          <span className="feature-chip">
            <span className="chip-dot" /> Custom Aliases
          </span>
        </div>

        {/* Live Platform Stats Strip */}
        <div className="stats-strip">
          <div className="stats-strip-item">
            <span>🔗 Total Links:</span>
            <span className="stats-strip-num">{platformStats.totalLinks}</span>
          </div>
          <span className="stats-divider">•</span>
          <div className="stats-strip-item">
            <span>🖱️ Total Clicks:</span>
            <span className="stats-strip-num">{platformStats.totalClicks}</span>
          </div>
        </div>
      </section>

      {/* Shorten Form Card */}
      <div className="glass-card shorten-card fade-in">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Destination URL *</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/very/long/url-link-to-shorten"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Custom Alias (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. summer-sale-2026"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Link Expiration (Optional)</label>
              <select
                className="form-select"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              >
                <option value="">Never</option>
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary shorten-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                <span>Creating Short Link...</span>
              </>
            ) : (
              'Shorten URL ⚡'
            )}
          </button>
        </form>
      </div>

      {/* Result Card with Slide-In Animation */}
      {result && (
        <div className="glass-card result-card slide-in">
          <div className="result-header">
            <h3>✨ Your Short Link is Ready!</h3>
            <span className="badge badge-active">Active</span>
          </div>

          <div className="result-link-box">
            <span className="short-url-text">{result.shortUrl}</span>
            <div className="result-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCopy(result.shortUrl)}
              >
                {copied ? 'Copied ✓' : '📋 Copy'}
              </button>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                🚀 Open
              </a>
            </div>
          </div>

          <div className="result-meta">
            <span>
              <strong>Target:</strong> {result.originalUrl}
            </span>
            {result.expiresAt && (
              <span>
                <strong>Expires On:</strong>{' '}
                {new Date(result.expiresAt).toLocaleDateString()} at{' '}
                {new Date(result.expiresAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
