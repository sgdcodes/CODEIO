import React, { useEffect, useRef, useState } from 'react';
import './IntroAnimation.css';

const WORDMARK = 'LinkVault';
const LOGO_AT = 3.9;
const EXIT_AT = 5.6;
const EXIT_MS = 700;
const CANVAS_END = 4.3;
const DIGIT_COUNT = 300;
const RAY_COUNT = 12;
const RING_BASE = [0, Math.PI / 3, -Math.PI / 3];

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const range = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

function makeDigits() {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: DIGIT_COUNT }, (_, i) => {
    const y = 1 - (i / (DIGIT_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    return {
      x: Math.cos(a) * r,
      y,
      z: Math.sin(a) * r,
      d: String(Math.floor(Math.random() * 10)),
    };
  });
}

function makeRays() {
  return Array.from({ length: RAY_COUNT }, (_, i) => ({
    angle: (i / RAY_COUNT) * Math.PI * 2 + Math.random() * 0.35,
    length: 0.55 + Math.random() * 0.75,
    width: 0.012 + Math.random() * 0.018,
  }));
}

function ringState(i, t) {
  let phi = RING_BASE[i] + t * 0.12 + 0.18 * Math.sin(t * 0.9 + i * 2);
  let squash = 0.3 + 0.1 * Math.sin(t * 1.3 + i * 1.7);
  let scale = 1;

  const flatten = easeInOut(range(t, 3.0, 3.5));
  const flatPhi = [0, Math.PI / 4, -Math.PI / 4][i];
  const flatSquash = [0.66, 0, 0][i];
  phi = lerp(phi, flatPhi, flatten);
  squash = lerp(squash, flatSquash, flatten);

  const collapse = easeInOut(range(t, 3.5, 3.9));
  phi = lerp(phi, [0, Math.PI / 2 - 0.25, -(Math.PI / 2 - 0.25)][i], collapse);
  squash = lerp(squash, [0.22, 0.32, 0.32][i], collapse);
  scale = lerp(scale, [0.72, 0.52, 0.52][i], collapse);

  return { phi, squash, scale };
}

function drawFlare(ctx, x, y, intensity, R, t, rays) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const glowR = R * 1.15 * intensity;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.55 * intensity})`);
  glow.addColorStop(0.18, `rgba(255, 232, 214, ${0.22 * intensity})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  const spin = t * 0.15;
  rays.forEach((ray) => {
    const len = R * ray.length * intensity;
    const a = ray.angle + spin;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const w = R * ray.width * intensity;
    const grad = ctx.createLinearGradient(x, y, x + cos * len, y + sin * len);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * intensity})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - sin * w, y + cos * w);
    ctx.lineTo(x + cos * len, y + sin * len);
    ctx.lineTo(x + sin * w, y - cos * w);
    ctx.closePath();
    ctx.fill();
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = R * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, R * 0.055 * (0.8 + 0.4 * Math.min(intensity, 1.2)), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDigits(ctx, digits, cx, cy, R, t, alpha) {
  if (alpha <= 0.01) return;
  const Rs = R * 0.68;
  const a = t * 0.55;
  const b = 0.3;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let currentFont = '';

  digits.forEach((p) => {
    if (Math.random() < 0.012) p.d = String(Math.floor(Math.random() * 10));
    const x1 = p.x * cosA + p.z * sinA;
    const z1 = -p.x * sinA + p.z * cosA;
    const y2 = p.y * cosB - z1 * sinB;
    const z2 = p.y * sinB + z1 * cosB;
    const depth = (z2 + 1) / 2;
    const bucket = Math.round(depth * 3);
    const font = `600 ${Math.round(Rs * (0.05 + bucket * 0.012))}px system-ui, -apple-system, sans-serif`;
    if (font !== currentFont) {
      ctx.font = font;
      currentFont = font;
    }
    ctx.globalAlpha = alpha * (0.12 + 0.88 * depth * depth);
    ctx.fillText(p.d, cx + x1 * Rs, cy + y2 * Rs);
  });
  ctx.restore();
}

function drawRings(ctx, cx, cy, R, t) {
  const drawn = easeOut(range(t, 0.1, 1.1));
  const alpha = 1 - range(t, 3.72, 3.95);
  if (drawn <= 0 || alpha <= 0) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(235, 235, 235, 0.85)';
  ctx.lineWidth = Math.max(1, R * 0.006);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 3; i++) {
    const { phi, squash, scale } = ringState(i, t);
    const start = i * 2.1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * scale, R * scale * squash, phi, start, start + Math.PI * 2 * drawn);
    ctx.stroke();
  }
  ctx.restore();
}

export default function IntroAnimation({ onDone }) {
  const canvasRef = useRef(null);
  const markRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const exitRef = useRef(null);
  const [logoShown, setLogoShown] = useState(false);
  const [exiting, setExiting] = useState(false);

  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const digits = makeDigits();
    const rays = makeRays();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let width = 0;
    let height = 0;
    let raf = 0;
    let start = 0;
    let logoTriggered = false;
    let exitTimer = 0;

    const exit = () => {
      if (exitTimer) return;
      cancelAnimationFrame(raf);
      setExiting(true);
      exitTimer = window.setTimeout(() => onDoneRef.current?.(), EXIT_MS);
    };
    exitRef.current = exit;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const markCenter = () => {
      const rect = markRef.current?.getBoundingClientRect();
      if (!rect) return { x: width / 2, y: height / 2 };
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const frame = (now) => {
      if (!start) start = now;
      const t = (now - start) / 1000;

      if (t < CANVAS_END) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 1 - range(t, LOGO_AT, CANVAS_END);
        const R = Math.min(width, height) * 0.27;
        const move = easeInOut(range(t, 3.5, 3.9));
        const target = markCenter();
        const cx = lerp(width / 2, target.x, move);
        const cy = lerp(height / 2, target.y, move);

        const digitAlpha = easeOut(range(t, 0.5, 1.2)) * (1 - range(t, 3.0, 3.45));
        drawDigits(ctx, digits, width / 2, height / 2, R, t, digitAlpha);
        drawRings(ctx, cx, cy, R, t);

        let intensity = easeOut(range(t, 0, 0.35)) * lerp(1, 0.5, range(t, 0.45, 1.1));
        intensity = lerp(intensity, 1.25, easeInOut(range(t, 3.45, 3.9)));
        drawFlare(ctx, cx, cy, intensity, R, t, rays);
        ctx.globalAlpha = 1;
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      if (!logoTriggered && t >= LOGO_AT) {
        logoTriggered = true;
        setLogoShown(true);
      }
      if (t >= EXIT_AT) {
        exit();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      setLogoShown(true);
      const timer = window.setTimeout(exit, 1400);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(exitTimer);
        window.removeEventListener('resize', resize);
        document.body.style.overflow = previousOverflow;
      };
    }

    raf = requestAnimationFrame(frame);

    const onKey = (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) exit();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const className = ['lv-intro', logoShown && 'is-logo', exiting && 'is-exit']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} onClick={() => exitRef.current?.()}>
      <canvas ref={canvasRef} className="lv-intro-canvas" aria-hidden="true" />

      <div className="lv-lockup" aria-hidden="true">
        <div className="lv-mark" ref={markRef}>
          <svg className="lv-sparkle" viewBox="-32 -32 64 64">
            <path d="M0 -32 C2 -8 8 -2 32 0 C8 2 2 8 0 32 C-2 8 -8 2 -32 0 C-8 -2 -2 -8 0 -32Z" fill="#FFFFFF" />
          </svg>
          <svg className="lv-orbit-mark" viewBox="-32 -32 64 64">
            <ellipse rx="27" ry="10.5" transform="rotate(-35)" pathLength="1" />
            <ellipse rx="27" ry="10.5" transform="rotate(35)" pathLength="1" />
            <circle r="5.5" />
          </svg>
        </div>

        <div className="lv-wordmark">
          {WORDMARK.split('').map((char, i) => (
            <span key={i} style={{ '--i': i }}>
              {char}
            </span>
          ))}
        </div>
      </div>

      <p className="lv-tagline" aria-hidden="true">Shorten. Share. Track.</p>

      <button
        type="button"
        className="lv-skip"
        onClick={(e) => {
          e.stopPropagation();
          exitRef.current?.();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
