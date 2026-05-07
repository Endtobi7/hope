import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

const LIMITS = {
  x: { min: 0, max: 300, step: 1 },
  y: { min: 0, max: 300, step: 1 },
  z: { min: 0, max: 100, step: 1 },
};

const PRESETS = [
  { name: 'Home',    pos: { x: 0,   y: 0,   z: 0  } },
  { name: 'Safe',    pos: { x: 150, y: 150, z: 50 } },
  { name: 'Top',     pos: { x: 150, y: 150, z: 100} },
  { name: 'Bottom',  pos: { x: 150, y: 150, z: 0  } },
  { name: 'Work 1',  pos: { x: 100, y: 100, z: 30 } },
  { name: 'Work 2',  pos: { x: 250, y: 250, z: 70 } },
];

const JOG = {
  x: 10,
  y: 10,
  z: 5,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function AxisSlider({ axis, value, onChange }) {
  const lim = LIMITS[axis];
  return (
    <div className="axis-row">
      <span className={`axis-label axis-${axis}`}>{axis.toUpperCase()}</span>
      <input
        type="range"
        min={lim.min}
        max={lim.max}
        step={lim.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`slider slider-${axis}`}
      />
      <span className="axis-value">{value.toFixed(1)}</span>
      <span className="axis-unit">mm</span>
    </div>
  );
}

function JogGroup({ axis, value, onChange }) {
  const lim  = LIMITS[axis];
  const step = JOG[axis];
  return (
    <div className="jog-group">
      <span className={`jog-label axis-${axis}`}>{axis.toUpperCase()}</span>
      <button className="jog-btn minus" onClick={() => onChange(clamp(value - step, lim.min, lim.max))}>
        −{step}
      </button>
      <span className="jog-current">{value.toFixed(1)}</span>
      <button className="jog-btn plus" onClick={() => onChange(clamp(value + step, lim.min, lim.max))}>
        +{step}
      </button>
    </div>
  );
}

function NumericInput({ axis, value, onChange }) {
  const lim = LIMITS[axis];
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(clamp(n, lim.min, lim.max));
    else setDraft(String(value));
  };

  return (
    <div className="numeric-row">
      <span className={`numeric-label axis-${axis}`}>{axis.toUpperCase()}</span>
      <input
        type="number"
        min={lim.min}
        max={lim.max}
        step={lim.step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className="numeric-input"
      />
      <span className="numeric-unit">mm</span>
    </div>
  );
}

export default function ControlPanel({ position, onPositionChange }) {
  const [tab, setTab]               = useState('manual');
  const [savedPositions, setSaved]  = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gantry-positions') || '[]');
    } catch { return []; }
  });
  const [saveName, setSaveName] = useState('');

  // Persist saved positions
  useEffect(() => {
    localStorage.setItem('gantry-positions', JSON.stringify(savedPositions));
  }, [savedPositions]);

  const updateAxis = (axis, value) => {
    onPositionChange({ ...position, [axis]: value });
  };

  const goToPreset = (preset) => {
    onPositionChange({ ...preset.pos });
  };

  const savePosition = () => {
    const name = saveName.trim() || `Position ${savedPositions.length + 1}`;
    setSaved((prev) => [
      ...prev,
      { name, x: position.x, y: position.y, z: position.z, id: Date.now() },
    ]);
    setSaveName('');
  };

  const deletePosition = (id) => {
    setSaved((prev) => prev.filter((p) => p.id !== id));
  };

  const goToSaved = (p) => {
    onPositionChange({ x: p.x, y: p.y, z: p.z });
  };

  return (
    <div className="control-panel">
      {/* ── Tabs ── */}
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'manual' ? ' active' : ''}`}
          onClick={() => setTab('manual')}
        >
          Manual Control
        </button>
        <button
          className={`tab-btn${tab === 'saved' ? ' active' : ''}`}
          onClick={() => setTab('saved')}
        >
          Saved Positions
          {savedPositions.length > 0 && (
            <span className="badge">{savedPositions.length}</span>
          )}
        </button>
      </div>

      {/* ── Manual Control Tab ── */}
      {tab === 'manual' && (
        <div className="tab-content">

          {/* Sliders */}
          <section className="section">
            <h3 className="section-title">Axis Sliders</h3>
            <div className="sliders">
              {['x', 'y', 'z'].map((ax) => (
                <AxisSlider
                  key={ax}
                  axis={ax}
                  value={position[ax]}
                  onChange={(v) => updateAxis(ax, v)}
                />
              ))}
            </div>
          </section>

          {/* Jog */}
          <section className="section">
            <h3 className="section-title">Jog Controls</h3>
            <div className="jog-container">
              {['x', 'y', 'z'].map((ax) => (
                <JogGroup
                  key={ax}
                  axis={ax}
                  value={position[ax]}
                  onChange={(v) => updateAxis(ax, v)}
                />
              ))}
            </div>
          </section>

          {/* Numeric inputs */}
          <section className="section">
            <h3 className="section-title">Precise Input</h3>
            <div className="numerics">
              {['x', 'y', 'z'].map((ax) => (
                <NumericInput
                  key={ax}
                  axis={ax}
                  value={position[ax]}
                  onChange={(v) => updateAxis(ax, v)}
                />
              ))}
            </div>
          </section>

          {/* Presets */}
          <section className="section">
            <h3 className="section-title">Quick Presets</h3>
            <div className="presets">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="preset-btn"
                  onClick={() => goToPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          {/* Save current position */}
          <section className="section">
            <h3 className="section-title">Save Position</h3>
            <div className="save-row">
              <input
                type="text"
                placeholder="Position name…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePosition(); }}
                className="save-input"
              />
              <button className="save-btn" onClick={savePosition}>
                Save
              </button>
            </div>
            <p className="save-hint">
              Current: X={position.x.toFixed(1)} Y={position.y.toFixed(1)} Z={position.z.toFixed(1)} mm
            </p>
          </section>

        </div>
      )}

      {/* ── Saved Positions Tab ── */}
      {tab === 'saved' && (
        <div className="tab-content">
          {savedPositions.length === 0 ? (
            <p className="empty-msg">No saved positions yet.<br />Save a position from the Manual Control tab.</p>
          ) : (
            <ul className="saved-list">
              {savedPositions.map((p) => (
                <li key={p.id} className="saved-item">
                  <div className="saved-info">
                    <span className="saved-name">{p.name}</span>
                    <span className="saved-coords">
                      X={p.x.toFixed(1)} &nbsp;Y={p.y.toFixed(1)} &nbsp;Z={p.z.toFixed(1)} mm
                    </span>
                  </div>
                  <div className="saved-actions">
                    <button className="go-btn" onClick={() => goToSaved(p)}>Go</button>
                    <button className="del-btn" onClick={() => deletePosition(p.id)}>✕</button>
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
