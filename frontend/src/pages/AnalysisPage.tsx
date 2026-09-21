import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RouteAnalysisResponse, SimulationResponse } from '../types';
import { analyzeDemo, simulate } from '../api';
import ElevationChart from '../components/ElevationChart';
import TerrainView from '../components/TerrainView';
import DetourSelector from '../components/DetourSelector';
import SimulationResults from '../components/SimulationResults';

export default function AnalysisPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RouteAnalysisResponse | null>(null);
  const [view, setView] = useState<'chart' | 'terrain' | 'split'>('split');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (!routeId) return;
    const cached = sessionStorage.getItem(`analysis-${routeId}`);
    if (cached) {
      setData(JSON.parse(cached));
    }
    // Always fetch fresh analysis from the backend to ensure live algorithm updates apply
    analyzeDemo(routeId)
      .then((fresh) => {
        setData(fresh);
        sessionStorage.setItem(`analysis-${routeId}`, JSON.stringify(fresh));
      })
      .catch((err) => {
        console.error('Failed to refresh demo analysis:', err);
        if (!cached) navigate('/');
      });
  }, [routeId, navigate]);

  const handleSimulate = async (startIdx: number, endIdx: number) => {
    if (!routeId) return;
    setIsSimulating(true);
    try {
      const res = await simulate(routeId, startIdx, endIdx);
      setSimulation(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setSimulation(null);
  };

  if (!data) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading analysis…</p>
        </div>
      </div>
    );
  }

  const { summary, maxClimbSegment, maxRecoverySegment, renderPoints, warnings } = data;

  return (
    <div className="page-container">
      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '6px 14px',
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem', fontWeight: 500
          }}
        >
          ← Back
        </button>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {data.routeName}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Route ID: {data.routeId}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="warnings-banner">
          <h4>Processing Warnings</h4>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* Message for no-climb */}
      {data.message && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <p style={{ color: 'var(--accent-climb)', fontSize: '0.875rem' }}>ℹ️ {data.message}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Route Summary</span>
        </div>
        <div className="stats-grid">
          <Stat value={`${summary.distanceKm}`} label="Distance (km)" />
          <Stat value={`${summary.totalGainM}`} label="Total Gain (m)" />
          <Stat value={`${summary.totalLossM}`} label="Total Loss (m)" />
          <Stat value={`${summary.highestPointM}`} label="Highest (m)" />
          <Stat value={`${summary.lowestPointM}`} label="Lowest (m)" />
          <Stat value={`${summary.avgGradePercent}%`} label="Avg Grade" />
        </div>
      </div>

      {/* Segments */}
      <div className="segments-row" style={{ marginBottom: 20 }}>
        {maxClimbSegment && (
          <div className="card">
            <div className="card-header">
              <span className="segment-badge climb">🔺 Max Climb</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-climb)', fontWeight: 500 }}>
                {maxClimbSegment.totalAscentM > maxClimbSegment.gainM ? '⚠️ Non-monotonic (+ minor dips)' : '✓ Pure Ascent'}
              </span>
            </div>
            <div className="segment-detail">
              <Detail value={`${maxClimbSegment.gainM}m`} label="Net Gain (Peak - Start)" />
              <Detail value={`${maxClimbSegment.totalAscentM}m`} label="Total Ascent (Cumulative Steps)" />
              <Detail value={`${maxClimbSegment.avgGradePercent}%`} label="Avg Grade" />
              <Detail value={`${maxClimbSegment.lengthKm} km`} label="Length" />
              <Detail value={`${maxClimbSegment.startDistanceKm}–${maxClimbSegment.endDistanceKm} km`} label="Range" />
            </div>
          </div>
        )}
        {maxRecoverySegment && (
          <div className="card">
            <div className="card-header">
              <span className="segment-badge recovery">🔻 Max Recovery</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-recovery)', fontWeight: 500 }}>
                {maxRecoverySegment.totalDescentM > maxRecoverySegment.gainM ? '⚠️ Non-monotonic (+ minor rises)' : '✓ Pure Descent'}
                {maxRecoverySegment.overlapsWithClimb ? ' · ⚠️ Overlaps Climb' : ' · ✓ Disjoint from Climb'}
              </span>
            </div>
            <div className="segment-detail">
              <Detail value={`${maxRecoverySegment.gainM}m`} label="Net Descent (Drop - End)" />
              <Detail value={`${maxRecoverySegment.totalDescentM}m`} label="Total Descent (Cumulative Steps)" />
              <Detail value={`${maxRecoverySegment.avgGradePercent}%`} label="Avg Grade" />
              <Detail value={`${maxRecoverySegment.lengthKm} km`} label="Length" />
              <Detail value={`${maxRecoverySegment.startDistanceKm}–${maxRecoverySegment.endDistanceKm} km`} label="Range" />
            </div>
          </div>
        )}
      </div>

      {/* View Toggle + Chart/Terrain Container */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="card-title">Elevation &amp; Terrain Profile</span>
            {hoverIndex != null && (
              <span className="hover-telemetry-pill">
                📍 Point #{hoverIndex}: {renderPoints.find(p => p.index === hoverIndex)?.distanceKm.toFixed(2)} km · {renderPoints.find(p => p.index === hoverIndex)?.smoothedElevationM.toFixed(1)} m
              </span>
            )}
          </div>
          <div className="view-toggle">
            <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}>
              ⚡ Split (2D + 3D Sync)
            </button>
            <button className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>
              📊 2D Profile
            </button>
            <button className={view === 'terrain' ? 'active' : ''} onClick={() => setView('terrain')}>
              🏔 3D Terrain
            </button>
          </div>
        </div>

        {view === 'split' && (
          <div className="split-view-grid">
            <div className="split-panel">
              <div className="panel-sublabel">2D Elevation Profile (Hover crosshair sync)</div>
              <ElevationChart
                points={renderPoints}
                climbSegment={maxClimbSegment}
                recoverySegment={maxRecoverySegment}
                hoverIndex={hoverIndex}
                onHover={setHoverIndex}
              />
            </div>
            <div className="split-panel">
              <div className="panel-sublabel">3D Terrain Ribbon (Interactive Orbit + Live Hover Sphere)</div>
              <TerrainView
                points={renderPoints}
                climbSegment={maxClimbSegment}
                recoverySegment={maxRecoverySegment}
                hoverIndex={hoverIndex}
                onHover={setHoverIndex}
              />
            </div>
          </div>
        )}

        {view === 'chart' && (
          <ElevationChart
            points={renderPoints}
            climbSegment={maxClimbSegment}
            recoverySegment={maxRecoverySegment}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
          />
        )}

        {view === 'terrain' && (
          <TerrainView
            points={renderPoints}
            climbSegment={maxClimbSegment}
            recoverySegment={maxRecoverySegment}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
          />
        )}
      </div>

      {/* What-If Detour Simulator */}
      <div style={{ marginTop: 24 }}>
        <DetourSelector
          points={renderPoints}
          routeId={routeId || ''}
          onSimulate={handleSimulate}
          onReset={handleResetSimulation}
          isSimulating={isSimulating}
          hasActiveSimulation={simulation != null}
        />
      </div>

      {/* Simulation Results (when active) */}
      {simulation && (
        <div style={{ marginTop: 20 }}>
          <SimulationResults simulation={simulation} />
        </div>
      )}

      {/* Algorithm Parameters */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-title">Algorithm Parameters</span>
          <span className="card-subtitle" style={{ marginTop: 0 }}>Transparency</span>
        </div>
        <div className="stats-grid">
          {Object.entries(data.algorithmParameters).map(([k, v]) => (
            <Stat key={k} value={String(v)} label={k.replace(/([A-Z])/g, ' $1').trim()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-item">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Detail({ value, label }: { value: string; label: string }) {
  return (
    <div className="detail-item">
      <span className="detail-value">{value}</span>
      <span className="detail-label">{label}</span>
    </div>
  );
}
