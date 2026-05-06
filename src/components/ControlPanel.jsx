import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

const LIMITS = {
  x: { min: 0, max: 300, step: 0.1, jog: 10 },
  y: { min: 0, max: 300, step: 0.1, jog: 10 },
  z: { min: 0, max: 100, step: 0.1, jog: 5 },
};

const QUICK_PRESETS = [
  { label: 'Home', icon: '🏠', pos: { x: 0, y: 0, z: 0 } },
  { label: 'Safe', icon: '🛡️', pos: { x: 150, y: 150, z: 50 } },
  { label: 'Top', icon: '⬆️', pos: { x: 150, y: 150, z: 100 } },
  { label: 'Bottom', icon: '⬇️', pos: { x: 150, y: 150, z: 0 } },
  { label: 'Work A', icon: '⚙️', pos: { x: 80, y: 200, z: 30 } },
  { label: 'Work B', icon: '🔧', pos: { x: 220, y: 100, z: 60 } },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function ControlPanel({ position, onPositionChange }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [savedPositions, setSavedPositions] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [inputValues, setInputValues] = useState({
    x: position.x,
    y: position.y,
    z: position.z,
  });

  // Sync input display with external position changes
  useEffect(() => {
    setInputValues({ x: position.x, y: position.y, z: position.z });
  }, [position]);

  // Load saved positions from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('gantry_positions') || '[]');
      setSavedPositions(stored);
    } catch {
      setSavedPositions([]);
    }
  }, []);

  // Persist saved positions
  useEffect(() => {
    localStorage.setItem('gantry_positions', JSON.stringify(savedPositions));
  }, [savedPositions]);

  const update = (axis, value) => {
    const lim = LIMITS[axis];
    const clamped = clamp(parseFloat(value) || 0, lim.min, lim.max);
    onPositionChange({ ...position, [axis]: clamped });
  };

  const jog = (axis, direction) => {
    const lim = LIMITS[axis];
    const newValue = clamp(position[axis] + direction * lim.jog, lim.min, lim.max);
    onPositionChange({ ...position, [axis]: newValue });
  };

  const handleSlider = (axis, e) => {
    update(axis, e.target.value);
  };

  const handleInputChange = (axis, value) => {
    setInputValues((prev) => ({ ...prev, [axis]: value }));
  };

  const handleInputBlur = (axis) => {
    update(axis, inputValues[axis]);
  };

  const handleInputKeyDown = (axis, e) => {
    if (e.key === 'Enter') update(axis, inputValues[axis]);
  };

  const loadPreset = (pos) => {
    onPositionChange({ ...pos });
  };

  const saveCurrentPosition = () => {
    const name = saveName.trim() || `Pos ${savedPositions.length + 1}`;
    const entry = { name, pos: { ...position }, timestamp: Date.now() };
    setSavedPositions((prev) => [...prev, entry]);
    setSaveName('');
  };

  const deleteSavedPosition = (idx) => {
    setSavedPositions((prev) => prev.filter((_, i) => i !== idx));
  };

  const axes = [
    { key: 'x', label: 'X Axis', color: '#a855f7', unit: 'mm', range: '0–300 mm' },
    { key: 'y', label: 'Y Axis', color: '#3b82f6', unit: 'mm', range: '0–300 mm' },
    { key: 'z', label: 'Z Axis', color: '#22d3ee', unit: 'mm', range: '0–100 mm' },
  ];

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>🎮 Controls</h2>
        <div className="position-badge">
          <span>X: {position.x.toFixed(1)}</span>
          <span>Y: {position.y.toFixed(1)}</span>
          <span>Z: {position.z.toFixed(1)}</span>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual
        </button>
        <button
          className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved ({savedPositions.length})
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="tab-content">
          {/* Axis Controls */}
          {axes.map(({ key, label, color, unit, range }) => (
            <div className="axis-group" key={key} style={{ '--axis-color': color }}>
              <div className="axis-header">
                <span className="axis-label" style={{ color }}>{label}</span>
                <span className="axis-range">{range}</span>
              </div>

              <div className="slider-row">
                <button className="jog-btn" onClick={() => jog(key, -1)}>−</button>
                <input
                  type="range"
                  min={LIMITS[key].min}
                  max={LIMITS[key].max}
                  step={LIMITS[key].step}
                  value={position[key]}
                  onChange={(e) => handleSlider(key, e)}
                  className="axis-slider"
                  style={{ accentColor: color }}
                />
                <button className="jog-btn" onClick={() => jog(key, 1)}>+</button>
              </div>

              <div className="input-row">
                <input
                  type="number"
                  min={LIMITS[key].min}
                  max={LIMITS[key].max}
                  step={0.1}
                  value={inputValues[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onBlur={() => handleInputBlur(key)}
                  onKeyDown={(e) => handleInputKeyDown(key, e)}
                  className="axis-input"
                />
                <span className="axis-unit">{unit}</span>
                <span className="jog-hint">±{LIMITS[key].jog} mm/click</span>
              </div>
            </div>
          ))}

          {/* Quick Presets */}
          <div className="presets-section">
            <h3>Quick Presets</h3>
            <div className="presets-grid">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="preset-btn"
                  onClick={() => loadPreset(p.pos)}
                  title={`X:${p.pos.x} Y:${p.pos.y} Z:${p.pos.z}`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save current position */}
          <div className="save-section">
            <h3>Save Position</h3>
            <div className="save-row">
              <input
                type="text"
                placeholder="Position name…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="save-name-input"
                onKeyDown={(e) => e.key === 'Enter' && saveCurrentPosition()}
              />
              <button className="save-btn" onClick={saveCurrentPosition}>
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="tab-content">
          {savedPositions.length === 0 ? (
            <div className="empty-state">
              <p>📋 No saved positions yet.</p>
              <p>Go to Manual tab and save a position.</p>
            </div>
          ) : (
            <ul className="saved-list">
              {savedPositions.map((entry, idx) => (
                <li key={entry.timestamp} className="saved-item">
                  <div className="saved-info">
                    <span className="saved-name">{entry.name}</span>
                    <span className="saved-coords">
                      X:{entry.pos.x.toFixed(1)} Y:{entry.pos.y.toFixed(1)} Z:{entry.pos.z.toFixed(1)}
                    </span>
                  </div>
                  <div className="saved-actions">
                    <button
                      className="go-btn"
                      onClick={() => onPositionChange({ ...entry.pos })}
                    >
                      Go
                    </button>
                    <button
                      className="del-btn"
                      onClick={() => deleteSavedPosition(idx)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
