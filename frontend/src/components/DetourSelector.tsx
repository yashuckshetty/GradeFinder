import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { PointDto } from '../types';

interface DetourSelectorProps {
  points: PointDto[];
  routeId: string;
  onSimulate: (startIdx: number, endIdx: number) => void;
  onReset: () => void;
  isSimulating: boolean;
  hasActiveSimulation: boolean;
}

export const DetourSelector: React.FC<DetourSelectorProps> = ({
  points,
  routeId,
  onSimulate,
  onReset,
  isSimulating,
  hasActiveSimulation,
}) => {
  const maxIdx = Math.max(0, points.length - 1);
  const [startIdx, setStartIdx] = useState<number>(0);
  const [endIdx, setEndIdx] = useState<number>(Math.min(20, maxIdx));
  const [isDraggingHandle, setIsDraggingHandle] = useState<'start' | 'end' | 'range' | null>(null);

  const chartSvgRef = useRef<SVGSVGElement>(null);

  const maxDist = useMemo(() => {
    if (points.length === 0) return 1;
    return points[points.length - 1].distanceKm || 1;
  }, [points]);

  const minEle = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.min(...points.map((p) => p.smoothedElevationM));
  }, [points]);

  const maxEle = useMemo(() => {
    if (points.length === 0) return 100;
    return Math.max(...points.map((p) => p.smoothedElevationM));
  }, [points]);

  const eleRange = (maxEle - minEle) || 1;

  // Compute SVG polyline coordinates
  const svgPoints = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p) => {
        const x = (p.distanceKm / maxDist) * 1000;
        const y = 140 - ((p.smoothedElevationM - minEle) / eleRange) * 100;
        return `${x},${y}`;
      })
      .join(' ');
  }, [points, maxDist, minEle, eleRange]);

  const pStart = points[startIdx] || points[0] || { distanceKm: 0, smoothedElevationM: 0 };
  const pEnd = points[endIdx] || points[maxIdx] || { distanceKm: maxDist, smoothedElevationM: 0 };

  const startX = (pStart.distanceKm / maxDist) * 1000;
  const endX = (pEnd.distanceKm / maxDist) * 1000;

  const setPreset = (s: number, e: number) => {
    setStartIdx(Math.max(0, Math.min(s, maxIdx)));
    setEndIdx(Math.max(0, Math.min(e, maxIdx)));
  };

  // Convert mouse X inside SVG to nearest track point index
  const getIndexFromMouseX = useCallback(
    (clientX: number) => {
      if (!chartSvgRef.current) return 0;
      const rect = chartSvgRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetDist = pct * maxDist;

      // Binary search nearest index
      let low = 0;
      let high = points.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (points[mid].distanceKm < targetDist) low = mid + 1;
        else high = mid - 1;
      }
      return Math.max(0, Math.min(maxIdx, low));
    },
    [points, maxDist, maxIdx]
  );

  const handlePointerDown = (handle: 'start' | 'end' | 'range', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHandle(handle);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newIdx = getIndexFromMouseX(moveEvent.clientX);
      if (handle === 'start') {
        setStartIdx(() => Math.min(newIdx, endIdx));
      } else if (handle === 'end') {
        setEndIdx(() => Math.max(newIdx, startIdx));
      }
    };

    const onPointerUp = () => {
      setIsDraggingHandle(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Compute boundary-aware distance cut matching backend splice logic exactly:
  // Excluding K = (endIdx - startIdx + 1) points eliminates K track steps.
  // When endIdx < points.length - 1, the cut spans up to points[endIdx + 1].distanceKm.
  const distCut = useMemo(() => {
    if (points.length === 0 || startIdx > endIdx) return 0;
    if (endIdx < points.length - 1) {
      return Math.max(0, points[endIdx + 1].distanceKm - points[startIdx].distanceKm);
    }
    const prevDist = startIdx > 0 ? points[startIdx - 1].distanceKm : 0;
    return Math.max(0, points[points.length - 1].distanceKm - prevDist);
  }, [points, startIdx, endIdx]);

  const cutRangeEndKm = endIdx < points.length - 1 ? points[endIdx + 1].distanceKm : pEnd.distanceKm;
  const pointsCut = endIdx - startIdx + 1;


  return (
    <div
      className="card detour-selector-card"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
      }}
    >
      {/* Clean header without emoji clutter per Section 16 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Interactive Modeling
          </span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 600, marginTop: '2px' }}>
            What-If Detour Simulator
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', marginTop: '4px' }}>
            Directly drag the detour window on the elevation profile, or select a quick bypass preset.
          </p>
        </div>

        {hasActiveSimulation && (
          <button type="button" className="btn-ghost" onClick={onReset} style={{ fontSize: 'var(--text-small)', padding: '6px 14px' }}>
            ↺ Reset Route
          </button>
        )}
      </div>

      {/* ── 16. Direct-Manipulation Drag Overlay on 2D Elevation Profile ───────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '160px',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          marginBottom: 'var(--space-4)',
          userSelect: 'none',
        }}
      >
        <svg
          ref={chartSvgRef}
          width="100%"
          height="100%"
          viewBox="0 0 1000 160"
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: isDraggingHandle ? 'ew-resize' : 'crosshair' }}
        >
          {/* Base elevation line */}
          <polyline
            points={svgPoints}
            fill="none"
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
            opacity="0.4"
          />

          {/* Shaded Draggable Detour Overlay Window */}
          <rect
            x={Math.min(startX, endX)}
            y="0"
            width={Math.max(4, Math.abs(endX - startX))}
            height="160"
            fill={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'}
            fillOpacity={isDraggingHandle ? 0.35 : 0.22}
            stroke={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'}
            strokeWidth="1.5"
            strokeDasharray="4 2"
            style={{ transition: 'fill 150ms ease, stroke 150ms ease' }}
          />

          {/* Left Handle */}
          <g
            transform={`translate(${startX}, 0)`}
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => handlePointerDown('start', e)}
          >
            <line y1="0" y2="160" stroke={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'} strokeWidth="3" />
            <rect x="-8" y="60" width="16" height="40" rx="3" fill="var(--color-surface)" stroke={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'} strokeWidth="2" />
            <line x1="-3" y1="72" x2="-3" y2="88" stroke="var(--color-text-muted)" strokeWidth="1.5" />
            <line x1="3" y1="72" x2="3" y2="88" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          </g>

          {/* Right Handle */}
          <g
            transform={`translate(${endX}, 0)`}
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => handlePointerDown('end', e)}
          >
            <line y1="0" y2="160" stroke={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'} strokeWidth="3" />
            <rect x="-8" y="60" width="16" height="40" rx="3" fill="var(--color-surface)" stroke={isDraggingHandle ? 'var(--color-warning)' : 'var(--color-primary)'} strokeWidth="2" />
            <line x1="-3" y1="72" x2="-3" y2="88" stroke="var(--color-text-muted)" strokeWidth="1.5" />
            <line x1="3" y1="72" x2="3" y2="88" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Live Dragging Telemetry Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: isDraggingHandle ? 'var(--color-warning)' : 'var(--color-text-secondary)',
            background: 'rgba(20, 18, 15, 0.85)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            pointerEvents: 'none',
          }}
        >
          Excluded: Points #{startIdx}–#{endIdx} ({pStart.distanceKm.toFixed(2)} km → {cutRangeEndKm.toFixed(2)} km · {distCut.toFixed(2)} km bypassed)
        </div>
      </div>

      {/* ── Quick-Preset Buttons Using Token System ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
          Quick Presets:
        </span>
        {routeId === 'multi-climb' && (
          <button
            type="button"
            className={`btn-ghost ${startIdx === 0 && endIdx === 20 ? 'active' : ''}`}
            onClick={() => setPreset(0, 20)}
            style={{
              padding: '6px 14px',
              fontSize: 'var(--text-small)',
              borderColor: startIdx === 0 && endIdx === 20 ? 'var(--color-primary)' : 'var(--color-border)',
              background: startIdx === 0 && endIdx === 20 ? 'var(--color-primary-muted)' : 'transparent',
              color: startIdx === 0 && endIdx === 20 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            Bypass Climb 1 (Points 0–20)
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPreset(0, Math.floor(maxIdx * 0.35))}
          style={{ padding: '6px 14px', fontSize: 'var(--text-small)' }}
        >
          Bypass First 35%
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPreset(Math.floor(maxIdx * 0.3), Math.floor(maxIdx * 0.65))}
          style={{ padding: '6px 14px', fontSize: 'var(--text-small)' }}
        >
          Bypass Mid-Section
        </button>
      </div>

      {/* ── Footer Telemetry & Primary Simulate Button ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Cut Window: <strong style={{ color: 'var(--color-text-primary)' }}>#{startIdx}–#{endIdx}</strong> ({pointsCut} pts)
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Distance Bypassed: <strong style={{ color: 'var(--color-climb)' }}>{distCut.toFixed(2)} km</strong>
          </span>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={isSimulating || pointsCut <= 0}
          onClick={() => onSimulate(startIdx, endIdx)}
          style={{ padding: '10px 24px', fontSize: 'var(--text-body)' }}
        >
          {isSimulating ? 'Computing Spliced Route…' : 'Run What-If Simulation'}
        </button>
      </div>
    </div>
  );
};

export default DetourSelector;
