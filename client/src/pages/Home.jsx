import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { createShortUrl } from '../api/client';
import './Home.css';

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
      // Clear inputs
      setOriginalUrl('');
      setCustomAlias('');
      setExpiresInDays('');
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to shorten URL';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
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

      {/* Result Card */}
      {result && (
        <div className="glass-card result-card fade-in">
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
                📋 Copy
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
