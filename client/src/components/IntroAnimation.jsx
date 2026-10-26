import React, { useEffect, useRef, useState } from 'react';
import './IntroAnimation.css';

const WORDMARK = 'LinkVault';
const LOGO_AT = 3.9;
const EXIT_AT = 5.6;
const EXIT_MS = 700;
const CANVAS_END = 4.3;
const DIGIT_COUNT = 300;
const DIGIT_BUCKETS = 4;
const RAY_COUNT = 12;
const RING_BASE = [0, Math.PI / 3, -Math.PI / 3];
const MAX_INTENSITY = 1.25;
const MAX_CORE = 0.8 + 0.4 * 1.2;
const MAX_DPR = 1.5;
const MIN_FRAME_MS = 1000 / 60 - 2;
const FONT_STACK = 'system-ui, -apple-system, sans-serif';

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
      d: Math.floor(Math.random() * 10),
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

function makeSprite(width, height, dpr, draw) {
  const sprite = document.createElement('canvas');
  sprite.width = Math.ceil(width * dpr);
  sprite.height = Math.ceil(height * dpr);
  const g = sprite.getContext('2d');
  g.scale(dpr, dpr);
  draw(g);
  return { canvas: sprite, width, height };
}

// Everything expensive (text shaping, gradients, shadow blur) is rasterised once
// per resize so each frame is only drawImage calls.
function buildSprites(R, dpr, rays) {
  const Rs = R * 0.68;
  const digits = Array.from({ length: DIGIT_BUCKETS }, (_, bucket) => {
    const size = Math.max(1, Math.round(Rs * (0.05 + bucket * 0.012)));
    const w = size;
    const h = Math.ceil(size * 1.3);
    return Array.from({ length: 10 }, (_, d) =>
      makeSprite(w, h, dpr, (g) => {
        g.fillStyle = '#FFFFFF';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `600 ${size}px ${FONT_STACK}`;
        g.fillText(String(d), w / 2, h / 2);
      })
    );
  });

  const glowR = R * 1.15 * MAX_INTENSITY;
  const rayR = R * Math.max(...rays.map((r) => r.length)) * MAX_INTENSITY;
  const half = Math.ceil(Math.max(glowR, rayR));
  const flare = makeSprite(half * 2, half * 2, dpr, (g) => {
    g.translate(half, half);
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, glowR);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.55 * MAX_INTENSITY})`);
    glow.addColorStop(0.18, `rgba(255, 232, 214, ${0.22 * MAX_INTENSITY})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(0, 0, glowR, 0, Math.PI * 2);
    g.fill();

    rays.forEach((ray) => {
      const len = R * ray.length * MAX_INTENSITY;
      const cos = Math.cos(ray.angle);
      const sin = Math.sin(ray.angle);
      const w = R * ray.width * MAX_INTENSITY;
      const grad = g.createLinearGradient(0, 0, cos * len, sin * len);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * MAX_INTENSITY})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(-sin * w, cos * w);
      g.lineTo(cos * len, sin * len);
      g.lineTo(sin * w, -cos * w);
      g.closePath();
      g.fill();
    });
  });

  const coreR = R * 0.055 * MAX_CORE;
  const blur = R * 0.12;
  const coreHalf = Math.ceil(coreR + blur * 2);
  const core = makeSprite(coreHalf * 2, coreHalf * 2, dpr, (g) => {
    g.fillStyle = '#FFFFFF';
    g.shadowColor = 'rgba(255, 255, 255, 0.9)';
    g.shadowBlur = blur * dpr;
    g.beginPath();
    g.arc(coreHalf, coreHalf, coreR, 0, Math.PI * 2);
    g.fill();
  });

  return { digits, flare, core };
}

function drawFlare(ctx, sprites, x, y, intensity, t, fade) {
  const { flare, core } = sprites;
  const k = intensity / MAX_INTENSITY;

  if (k > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * k;
    ctx.translate(x, y);
    ctx.rotate(t * 0.15);
    ctx.scale(k, k);
    ctx.drawImage(flare.canvas, -flare.width / 2, -flare.height / 2, flare.width, flare.height);
    ctx.restore();
  }

  const c = (0.8 + 0.4 * Math.min(intensity, 1.2)) / MAX_CORE;
  const cw = core.width * c;
  const ch = core.height * c;
  ctx.globalAlpha = fade;
  ctx.drawImage(core.canvas, x - cw / 2, y - ch / 2, cw, ch);
}

function drawDigits(ctx, sprites, digits, cx, cy, R, t, alpha) {
  if (alpha <= 0.01) return;
  const Rs = R * 0.68;
  const a = t * 0.55;
  const b = 0.3;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);

  for (let i = 0; i < digits.length; i++) {
    const p = digits[i];
    if (Math.random() < 0.012) p.d = Math.floor(Math.random() * 10);
    const x1 = p.x * cosA + p.z * sinA;
    const z1 = -p.x * sinA + p.z * cosA;
    const y2 = p.y * cosB - z1 * sinB;
    const z2 = p.y * sinB + z1 * cosB;
    const depth = (z2 + 1) / 2;
    const sprite = sprites.digits[Math.round(depth * (DIGIT_BUCKETS - 1))][p.d];
    ctx.globalAlpha = alpha * (0.12 + 0.88 * depth * depth);
    ctx.drawImage(
      sprite.canvas,
      cx + x1 * Rs - sprite.width / 2,
      cy + y2 * Rs - sprite.height / 2,
      sprite.width,
      sprite.height
    );
  }
  ctx.globalAlpha = 1;
}

function drawRings(ctx, cx, cy, R, t, fade) {
  const drawn = easeOut(range(t, 0.1, 1.1));
  const alpha = (1 - range(t, 3.72, 3.95)) * fade;
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
    const ctx = canvas.getContext('2d', { alpha: false });
    const digits = makeDigits();
    const rays = makeRays();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let width = 0;
    let height = 0;
    let R = 0;
    let sprites = null;
    let target = { x: 0, y: 0 };
    let raf = 0;
    let start = 0;
    let lastDraw = 0;
    let logoTriggered = false;
    let exitTimer = 0;
    let endTimer = 0;
    let cancelled = false;

    const exit = () => {
      if (exitTimer) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(endTimer);
      setExiting(true);
      exitTimer = window.setTimeout(() => onDoneRef.current?.(), EXIT_MS);
    };
    exitRef.current = exit;

    const clear = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    };

    const measureMark = () => {
      const rect = markRef.current?.getBoundingClientRect();
      target = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: width / 2, y: height / 2 };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      R = Math.min(width, height) * 0.27;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sprites = buildSprites(R, dpr, rays);
      measureMark();
      clear();
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!start) start = now;
      if (now - lastDraw < MIN_FRAME_MS) return;
      lastDraw = now;
      const t = (now - start) / 1000;

      if (!logoTriggered && t >= LOGO_AT) {
        logoTriggered = true;
        setLogoShown(true);
      }

      clear();
      if (t >= CANVAS_END) {
        cancelAnimationFrame(raf);
        endTimer = window.setTimeout(exit, (EXIT_AT - t) * 1000);
        return;
      }

      const fade = 1 - range(t, LOGO_AT, CANVAS_END);
      const move = easeInOut(range(t, 3.5, 3.9));
      const cx = lerp(width / 2, target.x, move);
      const cy = lerp(height / 2, target.y, move);

      const digitAlpha = easeOut(range(t, 0.5, 1.2)) * (1 - range(t, 3.0, 3.45));
      drawDigits(ctx, sprites, digits, width / 2, height / 2, R, t, digitAlpha);
      drawRings(ctx, cx, cy, R, t, fade);

      let intensity = easeOut(range(t, 0, 0.35)) * lerp(1, 0.5, range(t, 0.45, 1.1));
      intensity = lerp(intensity, MAX_INTENSITY, easeInOut(range(t, 3.45, 3.9)));
      drawFlare(ctx, sprites, cx, cy, intensity, t, fade);
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener('resize', resize);
    document.fonts?.ready.then(() => {
      if (!cancelled) measureMark();
    });

    if (reduceMotion) {
      setLogoShown(true);
      const timer = window.setTimeout(exit, 1400);
      return () => {
        cancelled = true;
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
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
      window.clearTimeout(endTimer);
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
