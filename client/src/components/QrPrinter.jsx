import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getQrCode, downloadQrPng, isLocalQr, formatShortLink } from '../api/client';
import './QrPrinter.css';

const STATUS_TEXT = {
  loading: 'Warming up',
  printing: 'Printing',
  done: 'Ready',
  error: 'Paper jam',
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Shows a link's QR code being printed out of a small receipt-style machine.
 * `link` needs shortUrl and shortCode; _id, qrCode and serverShortUrl are used when present.
 */
export default function QrPrinter({ link }) {
  const [qrSrc, setQrSrc] = useState(null);
  const [state, setState] = useState('loading');
  const [run, setRun] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const startPrint = useCallback(() => {
    setState(prefersReducedMotion() ? 'done' : 'printing');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setQrSrc(null);

    getQrCode(link)
      .then((src) => {
        if (!cancelled) setQrSrc(src);
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [link.shortUrl, link.originalUrl, link._id]);

  useEffect(() => {
    if (qrSrc && state === 'loading') startPrint();
  }, [qrSrc, state, startPrint]);

  const handlePaperAnimationEnd = (e) => {
    if (e.animationName === 'qrp-reveal') setState('done');
  };

  const reprint = () => {
    setRun((n) => n + 1);
    startPrint();
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadQrPng(link);
    } catch {
      toast.error('Could not download the QR code');
    } finally {
      setDownloading(false);
    }
  };

  const displayUrl = formatShortLink(link.shortCode);
  const localScan = isLocalQr(link);

  return (
    <div className="qrp" data-state={state}>
      <div className="qrp-machine" aria-hidden="true">
        <div className="qrp-panel">
          <span className="qrp-led" />
          <span className="qrp-model">LV-QR</span>
          <span className="qrp-status">{STATUS_TEXT[state]}</span>
        </div>
        <div className="qrp-vents">
          <span /><span /><span /><span />
        </div>
        <div className="qrp-slot">
          <span className="qrp-head" />
        </div>
      </div>

      <div
        key={run}
        className="qrp-feed"
        onAnimationEnd={handlePaperAnimationEnd}
      >
        {qrSrc && (
          <div className="qrp-paper">
            <img
              src={qrSrc}
              alt={`QR code for ${link.shortUrl}`}
              className="qrp-code"
              width="168"
              height="168"
              onLoad={state === 'loading' ? startPrint : undefined}
              onError={() => setState('error')}
            />
            <span className="qrp-caption">{displayUrl}</span>
            <span className="qrp-scan" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="qrp-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownload}
          disabled={!qrSrc || downloading}
        >
          {downloading ? 'Saving…' : 'Download PNG'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={reprint}
          disabled={!qrSrc || state === 'printing'}
        >
          Print again
        </button>
      </div>

      <p className="qrp-hint">
        {localScan
          ? 'Scan with a phone camera — it opens the destination (phones can’t reach localhost).'
          : 'Scan with a phone camera to open the short link.'}
      </p>
    </div>
  );
}
