import React, { useRef, useEffect, useCallback } from 'react';
import './GantryVisualizer.css';

// ─── Base image and canvas dimensions ─────────────────────────────────────────
const BASE_IMAGE = { w: 1617, h: 1035 };
const CANVAS_W = 900;
const SCALE = CANVAS_W / BASE_IMAGE.w;
const CANVAS_H = Math.round(BASE_IMAGE.h * SCALE);
const scale = (value) => value * SCALE;

// ─── Machine coordinate limits ───────────────────────────────────────────────
const COORD = {
  x: { min: 0, max: 300 },
  y: { min: 0, max: 300 },
  z: { min: 0, max: 100 },
};

// ─── Movement configuration (base image pixels) ──────────────────────────────
// Values are defined in the original 1617×1035 image space and scaled to the
// canvas to keep alignment consistent across sizes.
const MOVEMENT = {
  // X-axis: traverse rail slides horizontally
  xPixels: 503.07,
  // Y-axis: carriage depth-perspective offset (diagonal)
  yPixelsX: 53.9,
  yPixelsY: 35.93,
  // Z-axis: z-assembly rises upward
  zPixels: 287.47,
};

// Overlay draw sizes (base image pixels)
const OVERLAY = {
  bleu:   { w: 402, h: 303 },
  gauche: { w: 189, h: 108 },
  droit:  { w: 118, h: 48  },
};

// Overlay positional offsets (base image pixels)
const OVERLAY_OFFSET = {
  gaucheY: 413.23,
  droitY: 422.22,
  bleuY: 431.2,
  bleuX: 682.73,
};

// ─── Helper: linear map with clamp ───────────────────────────────────────────
function mapRange(value, fromMin, fromMax, toMin, toMax) {
  const clamped = Math.max(fromMin, Math.min(fromMax, value));
  return toMin + ((clamped - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}

// ─── Image sources ────────────────────────────────────────────────────────────
const IMG_SRCS = {
  bg:           process.env.PUBLIC_URL + '/images/1.bg.PNG',
  traverse:     process.env.PUBLIC_URL + '/images/2.traverse0.png',
  z0:           process.env.PUBLIC_URL + '/images/3.z0.PNG',
  z1:           process.env.PUBLIC_URL + '/images/4.z1.PNG',
  overlayBleu:  process.env.PUBLIC_URL + '/images/overlay chariot bleu.png',
  overlayGauche:process.env.PUBLIC_URL + '/images/overlay chariot gauche.png',
  overlayDroit: process.env.PUBLIC_URL + '/images/overlay chariot droit.png',
};

// ─── Preload all images into a map of { key: HTMLImageElement } ──────────────
function preloadImages(srcs) {
  return new Promise((resolve) => {
    const images = {};
    let remaining = Object.keys(srcs).length;
    Object.entries(srcs).forEach(([key, src]) => {
      const img = new Image();
      img.onload  = () => { images[key] = img; if (--remaining === 0) resolve(images); };
      img.onerror = () => { console.warn('Failed to load image:', src); if (--remaining === 0) resolve(images); };
      img.src = src;
    });
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GantryVisualizer({ position, isAnimating }) {
  const canvasRef  = useRef(null);
  const imagesRef  = useRef(null);   // loaded HTMLImageElement map
  const loadedRef  = useRef(false);

  // ── compute canvas-space pixel offsets from machine coordinates ────────────
  const computeOffsets = useCallback((pos) => {
    const xOff = mapRange(pos.x, COORD.x.min, COORD.x.max, 0, scale(MOVEMENT.xPixels));
    const yOffX = mapRange(pos.y, COORD.y.min, COORD.y.max, 0, scale(MOVEMENT.yPixelsX));
    const yOffY = mapRange(pos.y, COORD.y.min, COORD.y.max, 0, scale(MOVEMENT.yPixelsY));
    const zOff  = mapRange(pos.z, COORD.z.min, COORD.z.max, 0, scale(MOVEMENT.zPixels));
    return { xOff, yOffX, yOffY, zOff };
  }, []);

  // ── draw everything onto the canvas ───────────────────────────────────────
  const draw = useCallback((pos) => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesRef.current) return;
    const ctx    = canvas.getContext('2d');
    const imgs   = imagesRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const { xOff, yOffX, yOffY, zOff } = computeOffsets(pos);

    // Carriage screen position (for overlays & HUD)
    const carriageScreenX = xOff + yOffX;
    const carriageScreenY = yOffY;
    const overlayGauche = { w: scale(OVERLAY.gauche.w), h: scale(OVERLAY.gauche.h) };
    const overlayDroit = { w: scale(OVERLAY.droit.w), h: scale(OVERLAY.droit.h) };
    const overlayBleu = { w: scale(OVERLAY.bleu.w), h: scale(OVERLAY.bleu.h) };

    // ── 1. Background ─────────────────────────────────────────────────────
    if (imgs.bg) {
      ctx.drawImage(imgs.bg, 0, 0, CANVAS_W, CANVAS_H);
    }

    // ── 2. Traverse (moves with X only) ───────────────────────────────────
    if (imgs.traverse) {
      ctx.save();
      ctx.translate(xOff, 0);
      ctx.drawImage(imgs.traverse, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // ── 3. Z0 assembly (moves with X + Y) ─────────────────────────────────
    if (imgs.z0) {
      ctx.save();
      ctx.translate(carriageScreenX, carriageScreenY);
      ctx.drawImage(imgs.z0, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // ── 4. Z1 assembly (moves with X + Y + Z, upward) ─────────────────────
    if (imgs.z1) {
      ctx.save();
      ctx.translate(carriageScreenX, carriageScreenY - zOff);
      ctx.drawImage(imgs.z1, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // ── 5. Overlay – chariot gauche (left carriage depth) ─────────────────
    if (imgs.overlayGauche) {
      // anchored slightly left of carriage, at fixed Y depth
      const ox = carriageScreenX - overlayGauche.w * 0.6;
      const oy = carriageScreenY + scale(OVERLAY_OFFSET.gaucheY) + yOffY * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(imgs.overlayGauche, ox, oy, overlayGauche.w, overlayGauche.h);
      ctx.restore();
    }

    // ── 6. Overlay – chariot droit (right carriage depth) ─────────────────
    if (imgs.overlayDroit) {
      const ox = carriageScreenX + overlayDroit.w * 0.3;
      const oy = carriageScreenY + scale(OVERLAY_OFFSET.droitY) + yOffY * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(imgs.overlayDroit, ox, oy, overlayDroit.w, overlayDroit.h);
      ctx.restore();
    }

    // ── 7. Overlay – chariot bleu (blue carriage front) ───────────────────
    if (imgs.overlayBleu) {
      // Centered on carriage X, at lower vertical position
      const ox = carriageScreenX + scale(OVERLAY_OFFSET.bleuX) - overlayBleu.w / 2;
      const oy = carriageScreenY + scale(OVERLAY_OFFSET.bleuY) - zOff * 0.15;
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.drawImage(imgs.overlayBleu, ox, oy, overlayBleu.w, overlayBleu.h);
      ctx.restore();
    }

    // ── 8. HUD: coordinate readout ─────────────────────────────────────────
    drawHUD(ctx, pos, isAnimating);
  }, [computeOffsets, isAnimating]);

  // ── HUD overlay on canvas ──────────────────────────────────────────────────
  function drawHUD(ctx, pos, animating) {
    const pad = 12;
    const lineH = 22;
    const boxW = 190;
    const boxH = 100;
    const bx = CANVAS_W - boxW - pad;
    const by = pad;

    // Semi-transparent panel
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.arcTo(bx + boxW, by, bx + boxW, by + r, r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.arcTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH, r);
    ctx.lineTo(bx + r, by + boxH);
    ctx.arcTo(bx, by + boxH, bx, by + boxH - r, r);
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(102,126,234,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#aaa';
    ctx.fillText('Position', bx + 10, by + 10);

    const labels = [
      { label: 'X', value: pos.x, color: '#f87171', unit: 'mm' },
      { label: 'Y', value: pos.y, color: '#4ade80', unit: 'mm' },
      { label: 'Z', value: pos.z, color: '#60a5fa', unit: 'mm' },
    ];
    labels.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.fillText(
        `${item.label}: ${item.value.toFixed(1)} ${item.unit}`,
        bx + 10,
        by + 30 + i * lineH
      );
    });

    if (animating) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚡ MOVING', bx + 10, by + boxH - 18);
    }
    ctx.restore();
  }

  // ── Load images once on mount ─────────────────────────────────────────────
  useEffect(() => {
    preloadImages(IMG_SRCS).then((imgs) => {
      imagesRef.current = imgs;
      loadedRef.current = true;
      draw(position);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw whenever position or animating flag changes ────────────────────
  useEffect(() => {
    if (loadedRef.current) {
      draw(position);
    }
  }, [position, isAnimating, draw]);

  return (
    <div className="visualizer-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`gantry-canvas${isAnimating ? ' animating' : ''}`}
      />
    </div>
  );
}
