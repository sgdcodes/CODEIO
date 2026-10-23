import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { fetchAnalytics } from '../api/client';
import './Analytics.css';

export default function Analytics() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const report = await fetchAnalytics(id);
        setData(report);
      } catch (err) {
        toast.error('Failed to load analytics for this link');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2>Link Analytics Not Found</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0 2rem 0' }}>
          We could not locate analytics data for this URL.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Top Header */}
      <div className="analytics-header fade-in">
        <div>
          <Link
            to="/dashboard"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              display: 'inline-block',
              marginBottom: '0.5rem',
            }}
          >
            ← Back to Dashboard
          </Link>
          <h1>
            Analytics for <span className="gradient-text">/{data.shortCode}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            Target: {data.originalUrl}
          </p>
        </div>

        <a
          href={data.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary"
        >
          Visit Link ↗
        </a>
      </div>

      {/* Key Metric Cards */}
      <div className="stats-grid fade-in">
        <div className="glass-card stat-card">
          <span className="stat-title">Total Clicks</span>
          <span className="stat-value gradient-text">{data.totalClicks}</span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-title">Current Status</span>
          <span className="stat-value" style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
            <span
              className={`badge ${
                data.status === 'expired' ? 'badge-expired' : 'badge-active'
              }`}
            >
              {data.status}
            </span>
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-title">Created Date</span>
          <span className="stat-value" style={{ fontSize: '1.2rem' }}>
            {new Date(data.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-title">Expires On</span>
          <span className="stat-value" style={{ fontSize: '1.2rem' }}>
            {data.expiresAt
              ? new Date(data.expiresAt).toLocaleDateString()
              : 'Never'}
          </span>
        </div>
      </div>

      {/* 7-Day Clicks Chart */}
      <div className="glass-card chart-card fade-in">
        <h3 className="chart-title">📈 Clicks in the Last 7 Days</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.clicksPerDay} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => val.slice(5)} // Show MM-DD
              />
              <YAxis allowDecimals={false} stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(236, 72, 153, 0.4)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#F472B6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#clickGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      <div className="breakdown-grid fade-in">
        {/* Top Browsers */}
        <div className="glass-card breakdown-card">
          <h3>🌐 Top Browsers</h3>
          {data.topBrowsers.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <ul className="breakdown-list">
              {data.topBrowsers.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-name">{item.name}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Devices */}
        <div className="glass-card breakdown-card">
          <h3>📱 Top Devices</h3>
          {data.topDevices.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <ul className="breakdown-list">
              {data.topDevices.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-name">{item.name}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Referrers */}
        <div className="glass-card breakdown-card">
          <h3>🔗 Top Referrers</h3>
          {data.topReferrers.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <ul className="breakdown-list">
              {data.topReferrers.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-name">{item.name}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
