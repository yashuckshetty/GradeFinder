import { useState, useMemo } from 'react';
import type { PointDto } from '../types';

interface Props {
  points: PointDto[];
  routeId: string;
  onSimulate: (startIdx: number, endIdx: number) => void;
  onReset: () => void;
  isSimulating: boolean;
  hasActiveSimulation: boolean;
}

export default function DetourSelector({
  points,
  routeId,
  onSimulate,
  onReset,
  isSimulating,
  hasActiveSimulation,
}: Props) {
  const maxIdx = Math.max(0, points.length - 1);
  const [startIdx, setStartIdx] = useState<number>(0);
  const [endIdx, setEndIdx] = useState<number>(Math.min(20, maxIdx));

  // Compute preview metrics of the selected exclude segment
  const preview = useMemo(() => {
    if (points.length < 2) return null;
    const s = Math.min(startIdx, endIdx);
    const e = Math.max(startIdx, endIdx);
    const pStart = points[s] || points[0];
    const pEnd = points[e] || points[points.length - 1];

    const distCut = Math.max(0, pEnd.distanceKm - pStart.distanceKm);
    const pointsCut = e - s + 1;

    return {
      s,
      e,
      startDist: pStart.distanceKm,
      endDist: pEnd.distanceKm,
      startEle: pStart.smoothedElevationM,
      endEle: pEnd.smoothedElevationM,
      distCut: distCut.toFixed(2),
      pointsCut,
    };
  }, [points, startIdx, endIdx]);

  const handleStartChange = (val: number) => {
    const s = Math.max(0, Math.min(val, endIdx));
    setStartIdx(s);
  };

  const handleEndChange = (val: number) => {
    const e = Math.min(maxIdx, Math.max(val, startIdx));
    setEndIdx(e);
  };

  const setPreset = (s: number, e: number) => {
    setStartIdx(Math.max(0, Math.min(s, maxIdx)));
    setEndIdx(Math.max(0, Math.min(e, maxIdx)));
  };

  return (
    <div className="card detour-selector-card">
      <div className="card-header">
        <div>
          <span className="card-title">✂️ What-If Detour Simulator</span>
          <span className="card-subtitle">
            Bypass a climb or obstacle to preview route changes, grade shifts, and effort savings
          </span>
        </div>
        {hasActiveSimulation && (
          <button className="btn-secondary" onClick={onReset} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            ↺ Reset Route
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="detour-presets">
        <span className="preset-label">Presets:</span>
        {routeId === 'multi-climb' && (
          <button
            type="button"
            className={`preset-btn ${startIdx === 0 && endIdx === 20 ? 'active' : ''}`}
            onClick={() => setPreset(0, 20)}
          >
            🏔 Bypass Climb 1 (Pts 0–20)
          </button>
        )}
        <button
          type="button"
          className="preset-btn"
          onClick={() => setPreset(0, Math.floor(maxIdx * 0.35))}
        >
          First 35%
        </button>
        <button
          type="button"
          className="preset-btn"
          onClick={() => setPreset(Math.floor(maxIdx * 0.3), Math.floor(maxIdx * 0.65))}
        >
          Mid-Section
        </button>
      </div>

      {/* Range Sliders */}
      <div className="detour-controls">
        <div className="control-group">
          <div className="control-header">
            <label>Detour Start Point:</label>
            <span className="control-val">
              Point #{startIdx} ({points[startIdx]?.distanceKm.toFixed(2)} km · {points[startIdx]?.smoothedElevationM.toFixed(0)}m)
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={startIdx}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="range-slider"
          />
        </div>

        <div className="control-group">
          <div className="control-header">
            <label>Detour End Point:</label>
            <span className="control-val">
              Point #{endIdx} ({points[endIdx]?.distanceKm.toFixed(2)} km · {points[endIdx]?.smoothedElevationM.toFixed(0)}m)
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={endIdx}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            className="range-slider"
          />
        </div>
      </div>

      {/* Telemetry Summary & Action */}
      {preview && (
        <div className="detour-footer">
          <div className="detour-preview-stats">
            <span className="badge-pill">✂️ Cut: Points #{preview.s}–#{preview.e} ({preview.pointsCut} points)</span>
            <span className="badge-pill">📏 Bypasses: {preview.distCut} km ({preview.startDist.toFixed(2)}km → {preview.endDist.toFixed(2)}km)</span>
          </div>

          <button
            type="button"
            className="btn-primary simulate-btn"
            disabled={isSimulating || preview.pointsCut <= 0}
            onClick={() => onSimulate(preview.s, preview.e)}
          >
            {isSimulating ? 'Computing Spliced Route…' : '⚡ Run What-If Simulation'}
          </button>
        </div>
      )}
    </div>
  );
}
