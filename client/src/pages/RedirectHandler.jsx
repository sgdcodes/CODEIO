import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resolveShortUrl } from '../api/client';

export default function RedirectHandler() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setLoading(true);
        const result = await resolveShortUrl(shortCode);

        if (!result.found) {
          setNotFound(true);
          return;
        }

        if (result.expired) {
          setIsExpired(true);
          setLinkData(result.url);
          return;
        }

        if (result.isProtected) {
          setLinkData(result.url);
          return;
        }

        if (result.originalUrl) {
          // Direct 302-style browser navigation
          window.location.replace(result.originalUrl);
        }
      } catch (err) {
        toast.error('Failed to resolve short URL');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    handleRedirect();
  }, [shortCode]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setPasscodeError('Please enter a passcode');
      return;
    }

    setLoading(true);
    setPasscodeError('');

    try {
      const result = await resolveShortUrl(shortCode, passcode.trim());

      if (result.isProtected) {
        setPasscodeError('Incorrect passcode. Please try again.');
        toast.error('Incorrect passcode');
        return;
      }

      if (result.originalUrl) {
        toast.success('Passcode verified! Redirecting...');
        window.location.replace(result.originalUrl);
      }
    } catch {
      setPasscodeError('Error verifying passcode');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div className="glass-card fade-in" style={{ maxWidth: '440px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Departing via LinkVault ⚡</h2>
          <p style={{ color: 'var(--text-muted)' }}>Redirecting you to your destination...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem 2rem' }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} className="gradient-text">Link Not Found</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            The short link <code>/{shortCode}</code> does not exist or has been removed.
          </p>
          <Link to="/" className="btn btn-primary">Create a New Link 🚀</Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem 2rem' }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>⏳</span>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }} className="gradient-text">410 Gone — Link Expired</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            This short link expired on {linkData?.expiresAt ? new Date(linkData.expiresAt).toLocaleDateString() : 'a previous date'} and is no longer accessible.
          </p>
          <Link to="/" className="btn btn-primary">Return to Home 🏠</Link>
        </div>
      </div>
    );
  }

  // Passcode unlock form
  return (
    <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
      <div className="glass-card fade-in" style={{ maxWidth: '440px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Passcode Protected Link</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          The author has secured <code>/{shortCode}</code> with a passcode. Please enter the passcode to continue.
        </p>

        <form onSubmit={handleUnlock}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              className="form-input"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '2px' }}
            />
            {passcodeError && (
              <span style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                {passcodeError}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
            Unlock & Redirect 🚀
          </button>
        </form>

        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to LinkVault
        </Link>
      </div>
    </div>
  );
}
