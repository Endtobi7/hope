import React, { useRef, useEffect, useCallback } from 'react';
import './GantryVisualizer.css';

// ─── Canvas dimensions ───────────────────────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 600;

// ─── Machine coordinate limits ───────────────────────────────────────────────
const COORD = {
  x: { min: 0, max: 300 },
  y: { min: 0, max: 300 },
  z: { min: 0, max: 100 },
};

// ─── Movement configuration (canvas pixels) ──────────────────────────────────
// These values map machine coordinates to pixel offsets on the 900×600 canvas.
// The large platform images (1617×1035 RGBA) are drawn scaled to 900×600;
// each axis "slides" its layer by the pixel offset calculated below.
const MOVEMENT = {
  // X-axis: traverse rail slides horizontally 0 → 280 px
  xPixels: 280,
  // Y-axis: carriage depth-perspective offset (diagonal): 0 → 30 px right + 20 px down
  yPixelsX: 30,
  yPixelsY: 20,
  // Z-axis: z-assembly rises upward 0 → 160 px
  zPixels: 160,
};

// Overlay draw sizes (canvas pixels)
const OVERLAY = {
  bleu:   { w: 201, h: 152 },   // 402×303 original → half size
  gauche: { w: 95,  h: 54  },   // 189×108 original → half size
  droit:  { w: 59,  h: 24  },   // 118×48  original → half size
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
    const xOff = mapRange(pos.x, COORD.x.min, COORD.x.max, 0, MOVEMENT.xPixels);
    const yOffX = mapRange(pos.y, COORD.y.min, COORD.y.max, 0, MOVEMENT.yPixelsX);
    const yOffY = mapRange(pos.y, COORD.y.min, COORD.y.max, 0, MOVEMENT.yPixelsY);
    const zOff  = mapRange(pos.z, COORD.z.min, COORD.z.max, 0, MOVEMENT.zPixels);
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
      const ox = carriageScreenX - OVERLAY.gauche.w * 0.6;
      const oy = carriageScreenY + 230 + yOffY * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(imgs.overlayGauche, ox, oy, OVERLAY.gauche.w, OVERLAY.gauche.h);
      ctx.restore();
    }

    // ── 6. Overlay – chariot droit (right carriage depth) ─────────────────
    if (imgs.overlayDroit) {
      const ox = carriageScreenX + OVERLAY.droit.w * 0.3;
      const oy = carriageScreenY + 235 + yOffY * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(imgs.overlayDroit, ox, oy, OVERLAY.droit.w, OVERLAY.droit.h);
      ctx.restore();
    }

    // ── 7. Overlay – chariot bleu (blue carriage front) ───────────────────
    if (imgs.overlayBleu) {
      // Centered on carriage X, at lower vertical position
      const ox = carriageScreenX + 380 - OVERLAY.bleu.w / 2;
      const oy = carriageScreenY + 240 - zOff * 0.15;
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.drawImage(imgs.overlayBleu, ox, oy, OVERLAY.bleu.w, OVERLAY.bleu.h);
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
