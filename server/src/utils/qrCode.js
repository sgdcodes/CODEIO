import QRCode from 'qrcode';

// Error correction "M" survives ~15% damage, enough for a printed or on-screen code
const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

/**
 * Encode text (the short URL) as an SVG string.
 */
export const generateQrSvg = (text) => QRCode.toString(text, { ...QR_OPTIONS, type: 'svg' });

/**
 * Encode text as an SVG data URL, ready to drop into an <img src>.
 */
export const generateQrDataUrl = async (text) => {
  const svg = await generateQrSvg(text);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

/**
 * Encode text as a PNG buffer for downloads.
 */
export const generateQrPng = (text, width = 512) =>
  QRCode.toBuffer(text, { ...QR_OPTIONS, type: 'png', width });
