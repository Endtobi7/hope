import React, { useRef, useEffect, useCallback } from 'react';
import './GantryVisualizer.css';

const CONFIG = {
  canvas: { width: 900, height: 580 },
  coordinates: {
    x: { min: 0, max: 300 },
    y: { min: 0, max: 300 },
    z: { min: 0, max: 100 },
  },
  pixelRanges: {
    x: { min: 150, max: 750 },
    y: { min: 480, max: 120 },
    z: { min: 0, max: 180 },
  },
  origin: { x: 450, y: 500 },
  gridSize: 40,
  colors: {
    rail: '#ef4444',
    traverse: '#22c55e',
    carriage: '#3b82f6',
    zAssembly: '#eab308',
    gripper: '#f97316',
    grid: 'rgba(255,255,255,0.08)',
    axis: 'rgba(255,255,255,0.3)',
    text: 'rgba(255,255,255,0.7)',
    indicator: '#ec4899',
    background: '#0f0c29',
  },
  componentSizes: {
    rail: { width: 16, height: 320 },
    railPost: { width: 12, height: 30 },
    traverse: { width: 620, height: 18 },
    carriage: { width: 56, height: 44 },
    zAssembly: { width: 36, height: 140 },
    gripper: { width: 44, height: 22 },
  },
};

function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function GantryVisualizer({ position, isAnimating }) {
  const canvasRef = useRef(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = CONFIG.canvas;
    const { x: xVal, y: yVal, z: zVal } = position;
    const { coordinates: coords, pixelRanges: pr, colors, componentSizes: cs } = CONFIG;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f0c29');
    bgGrad.addColorStop(0.5, '#302b63');
    bgGrad.addColorStop(1, '#24243e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += CONFIG.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += CONFIG.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = colors.axis;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const mmVal = Math.round(i * 50);
      const px = mapRange(mmVal, coords.x.min, coords.x.max, pr.x.min, pr.x.max);
      ctx.fillText(`${mmVal}`, px, height - 10);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 6; i++) {
      const mmVal = Math.round(i * 50);
      const py = mapRange(mmVal, coords.y.min, coords.y.max, pr.y.min, pr.y.max);
      ctx.fillText(`${mmVal}`, 40, py + 4);
    }

    // Axis line labels
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X (mm)', width / 2, height - 2);
    ctx.save();
    ctx.translate(14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (mm)', 0, 0);
    ctx.restore();

    // --- Compute screen positions ---
    const screenX = mapRange(xVal, coords.x.min, coords.x.max, pr.x.min, pr.x.max);
    const screenY = mapRange(yVal, coords.y.min, coords.y.max, pr.y.min, pr.y.max);
    const screenZ = mapRange(zVal, coords.z.min, coords.z.max, 0, pr.z.max);

    // Fixed floor line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(50, pr.y.min + 20);
    ctx.lineTo(width - 50, pr.y.min + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Draw Rails (fixed left/right, X-axis moves them horizontally) ---
    const railOffsetX = 310; // half rail span
    const leftRailX = screenX - railOffsetX;
    const rightRailX = screenX + railOffsetX;
    const railTop = pr.y.min - 30;

    // Left rail
    ctx.fillStyle = colors.rail;
    ctx.shadowColor = colors.rail;
    ctx.shadowBlur = 8;
    ctx.fillRect(leftRailX - cs.rail.width / 2, railTop, cs.rail.width, cs.rail.height);
    // Left rail cap
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(leftRailX - cs.railPost.width / 2, railTop - cs.railPost.height, cs.railPost.width, cs.railPost.height);

    // Right rail
    ctx.fillStyle = colors.rail;
    ctx.fillRect(rightRailX - cs.rail.width / 2, railTop, cs.rail.width, cs.rail.height);
    // Right rail cap
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(rightRailX - cs.railPost.width / 2, railTop - cs.railPost.height, cs.railPost.width, cs.railPost.height);
    ctx.shadowBlur = 0;

    // --- Draw Traverse (horizontal beam connecting rails, moves with X) ---
    const traverseY = screenY;
    ctx.fillStyle = colors.traverse;
    ctx.shadowColor = colors.traverse;
    ctx.shadowBlur = 10;
    ctx.fillRect(leftRailX, traverseY - cs.traverse.height / 2, cs.traverse.width, cs.traverse.height);
    // Traverse end caps
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(leftRailX - 10, traverseY - 12, 10, 24);
    ctx.fillRect(leftRailX + cs.traverse.width, traverseY - 12, 10, 24);
    ctx.shadowBlur = 0;

    // Traverse label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVERSE', leftRailX + cs.traverse.width / 2, traverseY - 14);

    // --- Draw Carriage (rides on traverse, moves with Y along traverse) ---
    const carriageOffsetY = mapRange(yVal, coords.y.min, coords.y.max, -200, 200);
    const carriageX = screenX + carriageOffsetY - cs.carriage.width / 2;
    const carriageY = traverseY - cs.carriage.height / 2;

    ctx.fillStyle = colors.carriage;
    ctx.shadowColor = colors.carriage;
    ctx.shadowBlur = 12;
    // Carriage body
    const cGrad = ctx.createLinearGradient(carriageX, carriageY, carriageX + cs.carriage.width, carriageY + cs.carriage.height);
    cGrad.addColorStop(0, '#60a5fa');
    cGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = cGrad;
    ctx.fillRect(carriageX, carriageY, cs.carriage.width, cs.carriage.height);
    // Carriage border
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.strokeRect(carriageX, carriageY, cs.carriage.width, cs.carriage.height);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CARRIAGE', carriageX + cs.carriage.width / 2, carriageY - 4);

    // --- Draw Z-Assembly (extends downward from carriage, moves with Z) ---
    const zAsmX = carriageX + (cs.carriage.width - cs.zAssembly.width) / 2;
    const zAsmY = carriageY + cs.carriage.height;
    const zExtend = screenZ;

    ctx.shadowColor = colors.zAssembly;
    ctx.shadowBlur = 10;
    const zGrad = ctx.createLinearGradient(zAsmX, zAsmY, zAsmX, zAsmY + cs.zAssembly.height + zExtend);
    zGrad.addColorStop(0, '#fbbf24');
    zGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = zGrad;
    ctx.fillRect(zAsmX, zAsmY, cs.zAssembly.width, cs.zAssembly.height + zExtend);

    // Z-assembly segments / markings
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let seg = 1; seg <= 4; seg++) {
      const segY = zAsmY + (seg / 4) * (cs.zAssembly.height + zExtend);
      ctx.beginPath();
      ctx.moveTo(zAsmX + 4, segY);
      ctx.lineTo(zAsmX + cs.zAssembly.width - 4, segY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', zAsmX + cs.zAssembly.width / 2, zAsmY - 2);

    // --- Draw Gripper (at bottom of Z-assembly) ---
    const gripperY = zAsmY + cs.zAssembly.height + zExtend;
    const gripperX = carriageX + (cs.carriage.width - cs.gripper.width) / 2;

    ctx.shadowColor = colors.gripper;
    ctx.shadowBlur = 15;
    const gGrad = ctx.createLinearGradient(gripperX, gripperY, gripperX, gripperY + cs.gripper.height);
    gGrad.addColorStop(0, '#fb923c');
    gGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = gGrad;
    ctx.fillRect(gripperX, gripperY, cs.gripper.width, cs.gripper.height);

    // Gripper fingers
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(gripperX + 4, gripperY + cs.gripper.height, 10, 12);
    ctx.fillRect(gripperX + cs.gripper.width - 14, gripperY + cs.gripper.height, 10, 12);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GRIPPER', gripperX + cs.gripper.width / 2, gripperY + cs.gripper.height + 26);

    // --- Position Indicator (dot at gripper center) ---
    const indicX = gripperX + cs.gripper.width / 2;
    const indicY = gripperY + cs.gripper.height + 12;
    ctx.beginPath();
    ctx.arc(indicX, indicY, isAnimating ? 8 : 5, 0, Math.PI * 2);
    ctx.fillStyle = colors.indicator;
    ctx.shadowColor = colors.indicator;
    ctx.shadowBlur = isAnimating ? 20 : 10;
    ctx.fill();
    // Crosshair
    ctx.strokeStyle = colors.indicator;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(indicX - 15, indicY);
    ctx.lineTo(indicX + 15, indicY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(indicX, indicY - 15);
    ctx.lineTo(indicX, indicY + 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // --- Position readout box ---
    const boxX = width - 180;
    const boxY = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, 155, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('POSITION', boxX + 10, boxY + 18);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`X: ${xVal.toFixed(1)} mm`, boxX + 10, boxY + 36);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Y: ${yVal.toFixed(1)} mm`, boxX + 10, boxY + 52);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Z: ${zVal.toFixed(1)} mm`, boxX + 10, boxY + 68);

    // --- Legend ---
    const legend = [
      { color: colors.rail, label: 'Rails (X-Axis)' },
      { color: colors.traverse, label: 'Traverse' },
      { color: colors.carriage, label: 'Carriage (Y-Axis)' },
      { color: colors.zAssembly, label: 'Z-Assembly' },
      { color: colors.gripper, label: 'Gripper' },
    ];
    const legX = 20;
    let legY = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(legX - 5, legY - 5, 165, legend.length * 20 + 16, 6);
    ctx.fill();
    ctx.stroke();

    legend.forEach(({ color, label }) => {
      ctx.fillStyle = color;
      ctx.fillRect(legX, legY + 2, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, legX + 18, legY + 12);
      legY += 20;
    });

  }, [position, isAnimating]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className="gantry-visualizer">
      <div className="visualizer-header">
        <h2>Platform Visualization</h2>
        <span className={`status-indicator ${isAnimating ? 'animating' : ''}`}>
          {isAnimating ? '⚡ Moving' : '● Idle'}
        </span>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CONFIG.canvas.width}
          height={CONFIG.canvas.height}
          className="gantry-canvas"
        />
      </div>
    </div>
  );
}

export default GantryVisualizer;
