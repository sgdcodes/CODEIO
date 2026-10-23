import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
      <div
        className="glass-card fade-in"
        style={{
          maxWidth: '520px',
          margin: '0 auto',
          padding: '3rem 2rem',
        }}
      >
        <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '1rem' }}>
          🛸
        </span>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }} className="gradient-text">
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
          Lost in Hyperlink Space?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The page or short link you are searching for doesn't exist, was deleted, or has ventured into a black hole.
        </p>
        <Link to="/" className="btn btn-primary">
          Return to Mission Control 🚀
        </Link>
      </div>
    </div>
  );
}
