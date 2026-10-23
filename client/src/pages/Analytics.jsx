import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { fetchAnalytics } from '../api/client';
import './Analytics.css';

// Vibrant palette for donut charts
const DONUT_COLORS = ['#8B5CF6', '#EC4899', '#F97316', '#10B981', '#38BDF8', '#F59E0B'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const name = item.name || label || item.payload?.name;
  const value = item.value ?? item.payload?.count ?? item.payload?.clicks;

  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-name">{name}</span>
      <span className="chart-tooltip-count">{value}</span>
    </div>
  );
}

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
      } catch {
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

  // Determine badge for current status
  const isExpired =
    data.status === 'expired' ||
    (data.expiresAt && new Date(data.expiresAt) <= new Date());

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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
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
          <span>🚀</span>
          <span>Visit Short Link ↗</span>
        </a>
      </div>

      {/* Colorful Stat Cards with Emojis */}
      <div className="stats-grid fade-in">
        {/* Total Clicks */}
        <div className="glass-card stat-card stat-card-clicks">
          <div className="stat-icon-bubble">🖱️</div>
          <div className="stat-content">
            <span className="stat-title">Total Clicks</span>
            <span className="stat-value gradient-text">{data.totalClicks || 0}</span>
          </div>
        </div>

        {/* Current Status */}
        <div className="glass-card stat-card stat-card-status">
          <div className="stat-icon-bubble">⚡</div>
          <div className="stat-content">
            <span className="stat-title">Current Status</span>
            <div style={{ marginTop: '0.35rem' }}>
              <span className={`badge ${isExpired ? 'badge-expired' : 'badge-active'}`}>
                {isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Created Date */}
        <div className="glass-card stat-card stat-card-created">
          <div className="stat-icon-bubble">📅</div>
          <div className="stat-content">
            <span className="stat-title">Created Date</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>
              {new Date(data.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Expires On */}
        <div className="glass-card stat-card stat-card-expires">
          <div className="stat-icon-bubble">⏳</div>
          <div className="stat-content">
            <span className="stat-title">Expires On</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>
              {data.expiresAt
                ? new Date(data.expiresAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Clicks Bar Chart with Gradient Fills & Rounded Corners */}
      <div className="glass-card chart-card fade-in">
        <h3 className="chart-title">📊 Clicks in the Last 7 Days</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.clicksPerDay}
              margin={{ top: 15, right: 20, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.08)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                tick={{ fontSize: 12, fill: '#CBD5E1' }}
                tickFormatter={(val) => val.slice(5)} // Show MM-DD
              />
              <YAxis
                allowDecimals={false}
                stroke="#94A3B8"
                tick={{ fontSize: 12, fill: '#CBD5E1' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="clicks"
                fill="url(#barGrad)"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Metrics Grid (Donut Charts + Referrers) */}
      <div className="breakdown-grid fade-in">
        {/* Top Browsers Donut Chart */}
        <div className="glass-card breakdown-card">
          <h3>🌐 Top Browsers</h3>
          {data.topBrowsers.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <>
              <div className="donut-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topBrowsers}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {data.topBrowsers.map((entry, index) => (
                        <Cell
                          key={`cell-browser-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                          stroke="rgba(15, 23, 42, 0.8)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="breakdown-list">
                {data.topBrowsers.map((item, idx) => (
                  <li key={idx} className="breakdown-item">
                    <div className="breakdown-item-left">
                      <span
                        className="breakdown-dot"
                        style={{
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                        }}
                      />
                      <span className="breakdown-name">{item.name}</span>
                    </div>
                    <span className="breakdown-count">{item.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Top Devices Donut Chart */}
        <div className="glass-card breakdown-card">
          <h3>📱 Top Devices</h3>
          {data.topDevices.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <>
              <div className="donut-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topDevices}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {data.topDevices.map((entry, index) => (
                        <Cell
                          key={`cell-device-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                          stroke="rgba(15, 23, 42, 0.8)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="breakdown-list">
                {data.topDevices.map((item, idx) => (
                  <li key={idx} className="breakdown-item">
                    <div className="breakdown-item-left">
                      <span
                        className="breakdown-dot"
                        style={{
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                        }}
                      />
                      <span className="breakdown-name">{item.name}</span>
                    </div>
                    <span className="breakdown-count">{item.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Top Referrers */}
        <div className="glass-card breakdown-card">
          <h3>🔗 Top Referrers</h3>
          {data.topReferrers.length === 0 ? (
            <div className="empty-breakdown">No clicks tracked yet</div>
          ) : (
            <ul className="breakdown-list" style={{ marginTop: '0.5rem' }}>
              {data.topReferrers.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <div className="breakdown-item-left">
                    <span
                      className="breakdown-dot"
                      style={{
                        backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                      }}
                    />
                    <span className="breakdown-name">{item.name}</span>
                  </div>
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
