import React, { useRef, useEffect, useCallback } from 'react';
import './GantryVisualizer.css';

const CONFIG = {
  canvas: { width: 900, height: 600 },
  coordinates: {
    x: { min: 0, max: 300 },
    y: { min: 0, max: 300 },
    z: { min: 0, max: 100 },
  },
  pixelRanges: {
    // Traverse X movement range (pixels) — how far the traverse rail slides left/right
    x: { min: 80, max: 820 },
    // Carriage Y offset range on the traverse (pixels) — front/back perspective shift
    y: { min: 0, max: 60 },
    // Z-Assembly extension range (pixels upward from carriage)
    z: { min: 0, max: 160 },
  },
  // Fixed pixel positions on canvas
  layout: {
    bgX: 0,
    bgY: 0,
    bgW: 900,
    bgH: 600,

    traverseY: 320,   // Y pixel row where traverse sits on background
    traverseW: 680,
    traverseH: 80,

    carriageOffsetX: 300, // carriage is centered on the traverse image origin
    carriageW: 100,
    carriageH: 80,

    z0H: 120,
    z0W: 80,
    z1H: 100,
    z1W: 70,

    overlayW: 110,
    overlayH: 90,
  },
};

function mapRange(value, inMin, inMax, outMin, outMax) {
  const clamped = Math.max(inMin, Math.min(inMax, value));
  return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // graceful fallback
    img.src = src;
  });
}

const IMAGE_SRCS = {
  bg: '/images/1.bg.PNG',
  traverse: '/images/2.traverse0.png',
  z0: '/images/3.z0.PNG',
  z1: '/images/4.z1.PNG',
  overlayBleu: '/images/overlay chariot bleu.png',
  overlayDroit: '/images/overlay chariot droit.png',
  overlayGauche: '/images/overlay chariot gauche.png',
};

export default function GantryVisualizer({ position }) {
  const canvasRef = useRef(null);
  const imagesRef = useRef(null);
  const loadedRef = useRef(false);

  // Load images once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(
        Object.entries(IMAGE_SRCS).map(async ([key, src]) => {
          const img = await loadImage(src);
          return [key, img];
        })
      );
      if (!cancelled) {
        imagesRef.current = Object.fromEntries(entries);
        loadedRef.current = true;
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = CONFIG.canvas;
    const L = CONFIG.layout;
    const PR = CONFIG.pixelRanges;
    const C = CONFIG.coordinates;
    const imgs = imagesRef.current;

    ctx.clearRect(0, 0, width, height);

    // ── 1. Background ──────────────────────────────────────────────────────────
    if (imgs && imgs.bg) {
      ctx.drawImage(imgs.bg, L.bgX, L.bgY, L.bgW, L.bgH);
    } else {
      // Fallback: dark gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1a1a3e');
      grad.addColorStop(1, '#0a0a1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // ── 2. Traverse (moves on X-axis) ─────────────────────────────────────────
    // The traverse image x position: we center it on a point that tracks X coord
    const traverseAnchorX = mapRange(position.x, C.x.min, C.x.max, PR.x.min, PR.x.max);
    const traverseX = traverseAnchorX - L.traverseW / 2;
    const traverseY = L.traverseY;

    if (imgs && imgs.traverse) {
      ctx.drawImage(imgs.traverse, traverseX, traverseY, L.traverseW, L.traverseH);
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(traverseX, traverseY, L.traverseW, L.traverseH);
    }

    // ── 3. Carriage (moves with X and Y) ─────────────────────────────────────
    // Carriage sits on the traverse; Y gives a perspective offset (forward/back)
    const yOffset = mapRange(position.y, C.y.min, C.y.max, PR.y.min, PR.y.max);
    const carriageX = traverseAnchorX - L.carriageW / 2;
    const carriageY = traverseY - L.carriageH + 20 - yOffset;

    // ── 4. Z-Assembly (moves with X, Y, Z) ───────────────────────────────────
    const zExtension = mapRange(position.z, C.z.min, C.z.max, PR.z.min, PR.z.max);
    const z0X = carriageX - (L.z0W - L.carriageW) / 2;
    const z0Y = carriageY - L.z0H + 10;
    const z1X = z0X + (L.z0W - L.z1W) / 2;
    const z1Y = z0Y - L.z1H - zExtension;

    // Draw z1 first (bottom of the stack)
    if (imgs && imgs.z1) {
      ctx.drawImage(imgs.z1, z1X, z1Y, L.z1W, L.z1H);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(z1X, z1Y, L.z1W, L.z1H);
    }

    // Draw z0 on top of z1
    if (imgs && imgs.z0) {
      ctx.drawImage(imgs.z0, z0X, z0Y, L.z0W, L.z0H);
    } else {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(z0X, z0Y, L.z0W, L.z0H);
    }

    // ── 5. Carriage overlay images (for 3D depth) ────────────────────────────
    if (imgs && imgs.overlayGauche) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(imgs.overlayGauche, carriageX - 10, carriageY, L.overlayW, L.overlayH);
      ctx.globalAlpha = 1.0;
    }

    if (imgs && imgs.overlayDroit) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(imgs.overlayDroit, carriageX + L.carriageW - 20, carriageY, L.overlayW, L.overlayH);
      ctx.globalAlpha = 1.0;
    }

    if (imgs && imgs.overlayBleu) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(imgs.overlayBleu, carriageX - 5, carriageY - 10, L.overlayW, L.overlayH);
      ctx.globalAlpha = 1.0;
    }

    // ── 6. Gripper / end-effector indicator ──────────────────────────────────
    const gripperX = z1X + L.z1W / 2;
    const gripperY = z1Y;

    // Crosshair circle
    ctx.beginPath();
    ctx.arc(gripperX, gripperY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gripperX - 13, gripperY);
    ctx.lineTo(gripperX + 13, gripperY);
    ctx.moveTo(gripperX, gripperY - 13);
    ctx.lineTo(gripperX, gripperY + 13);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── 7. Coordinate readout overlay ────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.roundRect(10, 10, 200, 76, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`X: ${position.x.toFixed(1)} mm`, 22, 34);
    ctx.fillText(`Y: ${position.y.toFixed(1)} mm`, 22, 54);
    ctx.fillText(`Z: ${position.z.toFixed(1)} mm`, 22, 74);
    ctx.restore();
  }, [position]);

  // Redraw whenever position changes or images finish loading
  useEffect(() => {
    let raf;
    function frame() {
      draw();
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // Poll until images are loaded then trigger one more draw
  useEffect(() => {
    if (loadedRef.current) return;
    const interval = setInterval(() => {
      if (loadedRef.current) {
        clearInterval(interval);
        draw();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [draw]);

  return (
    <div className="visualizer-wrapper">
      <canvas
        ref={canvasRef}
        width={CONFIG.canvas.width}
        height={CONFIG.canvas.height}
        className="gantry-canvas"
      />
      <div className="canvas-legend">
        <span className="legend-item" style={{ color: '#4ade80' }}>■ Traverse (X)</span>
        <span className="legend-item" style={{ color: '#3b82f6' }}>■ Carriage (Y)</span>
        <span className="legend-item" style={{ color: '#fbbf24' }}>■ Z-Assembly (Z)</span>
        <span className="legend-item" style={{ color: '#ff4444' }}>✛ Gripper</span>
      </div>
    </div>
  );
}
