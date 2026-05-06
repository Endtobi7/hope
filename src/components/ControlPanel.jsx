import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

const LIMITS = {
  x: { min: 0, max: 300 },
  y: { min: 0, max: 300 },
  z: { min: 0, max: 100 },
};

const PRESETS = [
  { name: 'Home', x: 0, y: 0, z: 0 },
  { name: 'Safe', x: 150, y: 150, z: 0 },
  { name: 'Top', x: 150, y: 150, z: 0 },
  { name: 'Bottom', x: 150, y: 150, z: 100 },
  { name: 'Work1', x: 100, y: 100, z: 50 },
  { name: 'Work2', x: 200, y: 200, z: 50 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function ControlPanel({ position, onPositionChange }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [inputValues, setInputValues] = useState({
    x: position.x.toString(),
    y: position.y.toString(),
    z: position.z.toString(),
  });
  const [savedPositions, setSavedPositions] = useState([]);
  const [saveName, setSaveName] = useState('');

  // Load saved positions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gantry-saved-positions');
      if (stored) setSavedPositions(JSON.parse(stored));
    } catch (e) {
      console.warn('Could not load saved positions', e);
    }
  }, []);

  // Sync input values when position changes externally
  useEffect(() => {
    setInputValues({
      x: position.x.toFixed(1),
      y: position.y.toFixed(1),
      z: position.z.toFixed(1),
    });
  }, [position]);

  const updatePosition = (axis, value) => {
    const clamped = clamp(value, LIMITS[axis].min, LIMITS[axis].max);
    onPositionChange({ ...position, [axis]: clamped });
  };

  const handleSliderChange = (axis, value) => {
    updatePosition(axis, parseFloat(value));
  };

  const handleInputChange = (axis, value) => {
    setInputValues(prev => ({ ...prev, [axis]: value }));
  };

  const handleInputBlur = (axis) => {
    const clamped = clamp(inputValues[axis], LIMITS[axis].min, LIMITS[axis].max);
    updatePosition(axis, clamped);
    setInputValues(prev => ({ ...prev, [axis]: clamped.toFixed(1) }));
  };

  const handleInputKeyDown = (axis, e) => {
    if (e.key === 'Enter') handleInputBlur(axis);
  };

  const jog = (axis, delta) => {
    const newVal = clamp(position[axis] + delta, LIMITS[axis].min, LIMITS[axis].max);
    updatePosition(axis, newVal);
  };

  const goToPreset = (preset) => {
    onPositionChange({ x: preset.x, y: preset.y, z: preset.z });
  };

  const savePosition = () => {
    const name = saveName.trim() || `Pos ${savedPositions.length + 1}`;
    const newPos = {
      id: Date.now(),
      name,
      x: position.x,
      y: position.y,
      z: position.z,
      savedAt: new Date().toLocaleTimeString(),
    };
    const updated = [...savedPositions, newPos];
    setSavedPositions(updated);
    localStorage.setItem('gantry-saved-positions', JSON.stringify(updated));
    setSaveName('');
  };

  const loadPosition = (pos) => {
    onPositionChange({ x: pos.x, y: pos.y, z: pos.z });
  };

  const deletePosition = (id) => {
    const updated = savedPositions.filter(p => p.id !== id);
    setSavedPositions(updated);
    localStorage.setItem('gantry-saved-positions', JSON.stringify(updated));
  };

  const axisConfig = [
    { key: 'x', label: 'X-Axis', color: '#f87171', unit: 'mm', step: 1, jog: 10 },
    { key: 'y', label: 'Y-Axis', color: '#4ade80', unit: 'mm', step: 1, jog: 10 },
    { key: 'z', label: 'Z-Axis', color: '#fbbf24', unit: 'mm', step: 1, jog: 5 },
  ];

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>🎮 Control Panel</h2>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Control
        </button>
        <button
          className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved ({savedPositions.length})
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="tab-content">
          {/* Current Position Display */}
          <div className="position-display">
            <div className="pos-item" style={{ '--color': '#f87171' }}>
              <span className="pos-label">X</span>
              <span className="pos-value">{position.x.toFixed(1)}</span>
              <span className="pos-unit">mm</span>
            </div>
            <div className="pos-item" style={{ '--color': '#4ade80' }}>
              <span className="pos-label">Y</span>
              <span className="pos-value">{position.y.toFixed(1)}</span>
              <span className="pos-unit">mm</span>
            </div>
            <div className="pos-item" style={{ '--color': '#fbbf24' }}>
              <span className="pos-label">Z</span>
              <span className="pos-value">{position.z.toFixed(1)}</span>
              <span className="pos-unit">mm</span>
            </div>
          </div>

          {/* Axis Controls */}
          {axisConfig.map(({ key, label, color, step, jog: jogStep }) => (
            <div key={key} className="axis-control">
              <div className="axis-header">
                <span className="axis-label" style={{ color }}>{label}</span>
                <div className="axis-input-group">
                  <input
                    type="number"
                    className="axis-input"
                    value={inputValues[key]}
                    min={LIMITS[key].min}
                    max={LIMITS[key].max}
                    step={step}
                    onChange={e => handleInputChange(key, e.target.value)}
                    onBlur={() => handleInputBlur(key)}
                    onKeyDown={e => handleInputKeyDown(key, e)}
                    style={{ borderColor: color }}
                  />
                  <span className="axis-unit">mm</span>
                </div>
              </div>
              <input
                type="range"
                className="axis-slider"
                min={LIMITS[key].min}
                max={LIMITS[key].max}
                step={step}
                value={position[key]}
                onChange={e => handleSliderChange(key, e.target.value)}
                style={{ '--slider-color': color }}
              />
              <div className="range-labels">
                <span>{LIMITS[key].min}</span>
                <span>{LIMITS[key].max} mm</span>
              </div>
              <div className="jog-buttons">
                <button
                  className="jog-btn"
                  onClick={() => jog(key, -jogStep)}
                  style={{ '--btn-color': color }}
                >
                  ◀ -{jogStep}mm
                </button>
                <span className="jog-label">JOG</span>
                <button
                  className="jog-btn"
                  onClick={() => jog(key, jogStep)}
                  style={{ '--btn-color': color }}
                >
                  +{jogStep}mm ▶
                </button>
              </div>
            </div>
          ))}

          {/* Quick Presets */}
          <div className="presets-section">
            <h3>Quick Positions</h3>
            <div className="presets-grid">
              {PRESETS.map(preset => (
                <button
                  key={preset.name}
                  className="preset-btn"
                  onClick={() => goToPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Save Position */}
          <div className="save-section">
            <h3>Save Current Position</h3>
            <div className="save-row">
              <input
                type="text"
                className="save-input"
                placeholder="Position name..."
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePosition()}
              />
              <button className="save-btn" onClick={savePosition}>
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="tab-content">
          <h3 className="saved-title">Saved Positions</h3>
          {savedPositions.length === 0 ? (
            <div className="empty-state">
              <p>No saved positions yet.</p>
              <p>Use the Manual Control tab to save positions.</p>
            </div>
          ) : (
            <div className="saved-list">
              {savedPositions.map(pos => (
                <div key={pos.id} className="saved-item">
                  <div className="saved-info">
                    <span className="saved-name">{pos.name}</span>
                    <div className="saved-coords">
                      <span style={{ color: '#f87171' }}>X:{pos.x.toFixed(1)}</span>
                      <span style={{ color: '#4ade80' }}>Y:{pos.y.toFixed(1)}</span>
                      <span style={{ color: '#fbbf24' }}>Z:{pos.z.toFixed(1)}</span>
                    </div>
                    <span className="saved-time">{pos.savedAt}</span>
                  </div>
                  <div className="saved-actions">
                    <button
                      className="action-btn go-btn"
                      onClick={() => loadPosition(pos)}
                    >
                      GO
                    </button>
                    <button
                      className="action-btn del-btn"
                      onClick={() => deletePosition(pos.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {savedPositions.length > 0 && (
            <button
              className="clear-all-btn"
              onClick={() => {
                setSavedPositions([]);
                localStorage.removeItem('gantry-saved-positions');
              }}
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
