import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { RouteAnalysisResponse, SimulationResponse } from '../types';
import { analyzeDemo, simulate } from '../api';
import ElevationChart from '../components/ElevationChart';
import TerrainView from '../components/TerrainView';
import DetourSelector from '../components/DetourSelector';
import SimulationResults from '../components/SimulationResults';
import PurposefulLoading from '../components/PurposefulLoading';

export default function AnalysisPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RouteAnalysisResponse | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Desktop (>= 1280px) defaults to side-by-side split view per Section 15
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1280;
  const [view, setView] = useState<'split' | 'chart' | 'terrain'>(() => (isDesktop ? 'split' : 'chart'));

  useEffect(() => {
    if (!routeId) return;
    const cached = sessionStorage.getItem(`analysis-${routeId}`);
    if (cached) {
      setData(JSON.parse(cached));
    }
    // Refresh demo analysis
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
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <PurposefulLoading />
      </div>
    );
  }

  const { summary, maxClimbSegment, maxRecoverySegment, renderPoints, warnings } = data;

  return (
    <main className="page-container">
      {/* ── 12.1 Understated Route Identity Header ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            className="btn-ghost"
            style={{ padding: '4px 12px', fontSize: 'var(--text-small)' }}
            aria-label="Back to catalog"
          >
            ← Back
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 600 }}>
            {data.routeName}
          </h2>
          <span className="mono" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>
            {summary.distanceKm} km · {summary.totalGainM}m gain · {summary.avgGradePercent}% avg grade
          </span>
        </div>

        {/* View Toggle on screens <1280px */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {hoverIndex != null && (
            <span
              className="mono"
              style={{
                fontSize: 'var(--text-caption)',
                color: 'var(--color-primary)',
                background: 'var(--color-primary-muted)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              Point #{hoverIndex}: {renderPoints.find((p) => p.index === hoverIndex)?.distanceKm.toFixed(2)} km
            </span>
          )}

          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setView('split')}
              style={{
                padding: '6px 12px',
                background: view === 'split' ? 'var(--color-primary)' : 'transparent',
                color: view === 'split' ? 'var(--color-background)' : 'var(--color-text-secondary)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Split View
            </button>
            <button
              onClick={() => setView('chart')}
              style={{
                padding: '6px 12px',
                background: view === 'chart' ? 'var(--color-primary)' : 'transparent',
                color: view === 'chart' ? 'var(--color-background)' : 'var(--color-text-secondary)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              2D Profile
            </button>
            <button
              onClick={() => setView('terrain')}
              style={{
                padding: '6px 12px',
                background: view === 'terrain' ? 'var(--color-primary)' : 'transparent',
                color: view === 'terrain' ? 'var(--color-background)' : 'var(--color-text-secondary)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              3D Terrain
            </button>
          </div>
        </div>
      </div>

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <div className="error-banner" style={{ borderLeftColor: 'var(--color-warning)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ color: 'var(--color-warning)' }}>Processing Notice</h3>
          <ul>
            {warnings.map((w, i) => (
              <li key={i} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 12.2 Main Terrain Visualization Container (~60vh dominant module) ──── */}
      <section style={{ marginBottom: 'var(--space-6)' }}>
        {view === 'split' && (
          <div className="split-view-container">
            <div className="visualization-panel">
              <div className="panel-header">
                <span className="panel-title">2D Elevation Profile (Elevation vs Distance)</span>
              </div>
              <ElevationChart
                points={renderPoints}
                climbSegment={maxClimbSegment}
                recoverySegment={maxRecoverySegment}
                hoverIndex={hoverIndex}
                onHover={setHoverIndex}
              />
            </div>
            <div className="visualization-panel">
              <div className="panel-header">
                <span className="panel-title">3D Terrain Ribbon (5-Stop Gradient &amp; Fog)</span>
              </div>
              <TerrainView
                points={renderPoints}
                climbSegment={maxClimbSegment}
                recoverySegment={maxRecoverySegment}
                hoverIndex={hoverIndex}
                onHover={setHoverIndex}
                onFallbackTo2D={() => setView('chart')}
              />
            </div>
          </div>
        )}

        {view === 'chart' && (
          <div className="visualization-panel">
            <ElevationChart
              points={renderPoints}
              climbSegment={maxClimbSegment}
              recoverySegment={maxRecoverySegment}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
            />
          </div>
        )}

        {view === 'terrain' && (
          <div className="visualization-panel">
            <TerrainView
              points={renderPoints}
              climbSegment={maxClimbSegment}
              recoverySegment={maxRecoverySegment}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
              onFallbackTo2D={() => setView('chart')}
            />
          </div>
        )}
      </section>

      {/* ── 12.3 Key Insight Statement Directly Below Chart ────────────────────── */}
      {maxClimbSegment && (
        <section className="key-insight-banner">
          <p className="key-insight-text">
            Your hardest climb runs from <strong>{maxClimbSegment.startDistanceKm} km</strong> to{' '}
            <strong>{maxClimbSegment.endDistanceKm} km</strong> — <strong>{maxClimbSegment.gainM} m</strong> of
            sustained gain at <strong>{maxClimbSegment.avgGradePercent}%</strong>.
          </p>
        </section>
      )}

      {/* ── 12.4 Supporting Metrics Strip (Single Horizontal Mono Strip) ───────── */}
      <section className="metrics-strip">
        <div className="metric-strip-item">
          <span className="metric-strip-label">Distance</span>
          <span className="metric-strip-value">{summary.distanceKm} km</span>
        </div>
        <div className="metric-strip-item">
          <span className="metric-strip-label">Total Gain</span>
          <span className="metric-strip-value">{summary.totalGainM} m</span>
        </div>
        <div className="metric-strip-item">
          <span className="metric-strip-label">Total Loss</span>
          <span className="metric-strip-value">{summary.totalLossM} m</span>
        </div>
        <div className="metric-strip-item">
          <span className="metric-strip-label">Highest Point</span>
          <span className="metric-strip-value">{summary.highestPointM} m</span>
        </div>
        <div className="metric-strip-item">
          <span className="metric-strip-label">Lowest Point</span>
          <span className="metric-strip-value">{summary.lowestPointM} m</span>
        </div>
        <div className="metric-strip-item">
          <span className="metric-strip-label">Avg Grade</span>
          <span className="metric-strip-value">{summary.avgGradePercent}%</span>
        </div>
      </section>

      {/* ── 12.5 Interactive Analysis Detail Modules (Accent Bar Design) ─────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', margin: 'var(--space-6) 0' }}>
        {maxClimbSegment && (
          <div className="card" style={{ background: 'var(--color-surface)', borderLeft: '4px solid var(--color-climb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-climb)', fontWeight: 600, fontSize: 'var(--text-small)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ↗ Max Climb
              </span>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-climb)', fontFamily: 'var(--font-mono)' }}>
                {maxClimbSegment.totalAscentM > maxClimbSegment.gainM ? 'Non-monotonic (+ minor dips)' : 'Pure Ascent'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Net Gain</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxClimbSegment.gainM}m
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Ascent</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxClimbSegment.totalAscentM}m
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Avg Grade</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxClimbSegment.avgGradePercent}%
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Distance Range</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxClimbSegment.startDistanceKm}–{maxClimbSegment.endDistanceKm} km
                </p>
              </div>
            </div>
          </div>
        )}

        {maxRecoverySegment && (
          <div className="card" style={{ background: 'var(--color-surface)', borderLeft: '4px solid var(--color-recovery)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-recovery)', fontWeight: 600, fontSize: 'var(--text-small)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ↘ Max Recovery
              </span>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-recovery)', fontFamily: 'var(--font-mono)' }}>
                {maxRecoverySegment.totalDescentM > maxRecoverySegment.gainM ? 'Non-monotonic' : 'Pure Descent'} · {maxRecoverySegment.overlapsWithClimb ? 'Overlaps' : 'Disjoint'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Net Drop</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxRecoverySegment.gainM}m
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Descent</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxRecoverySegment.totalDescentM}m
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Avg Descent Grade</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxRecoverySegment.avgGradePercent}%
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Range</span>
                <p className="mono" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {maxRecoverySegment.startDistanceKm}–{maxRecoverySegment.endDistanceKm} km
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Alternate Maxima Notice (Muted Gold) */}
      {data.alternateMaxima && data.alternateMaxima.length > 0 && (
        <section
          className="card alternate-maxima-card"
          style={{
            background: 'var(--color-surface)',
            borderLeft: '4px solid var(--color-alternate-tie)',
            margin: 'var(--space-6) 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-alternate-tie)', fontWeight: 600, fontSize: 'var(--text-small)', textTransform: 'uppercase' }}>
              ⚖️ Alternate Maxima Ties Detected
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>
              ({data.alternateMaxima.length} additional equivalent interval)
            </span>
          </div>
          {data.alternateMaxima.map((alt, idx) => (
            <div key={idx} className="mono" style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', padding: '6px 0' }}>
              Tie #{idx + 1}: Points #{alt.startIndex}–#{alt.endIndex} ({alt.startDistanceKm}–{alt.endDistanceKm} km) · Gain: {alt.gainM}m · Grade: {alt.avgGradePercent}%
            </div>
          ))}
        </section>
      )}

      {/* Accessible Non-Visual Fallback */}
      <section
        className="card"
        aria-label="Accessible Route Climb and Recovery Summary"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          margin: 'var(--space-6) 0',
          padding: 'var(--space-4) var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>
          Accessible Route Summary
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', lineHeight: 1.6 }}>
          {maxClimbSegment
            ? `Hardest climb segment: runs from km ${maxClimbSegment.startDistanceKm} to km ${maxClimbSegment.endDistanceKm} (${maxClimbSegment.lengthKm} km). Net elevation gain is ${maxClimbSegment.gainM} meters at ${maxClimbSegment.avgGradePercent}% average grade. Cumulative ascent is ${maxClimbSegment.totalAscentM} meters.`
            : 'No significant sustained climb was detected.'}
          {' '}
          {maxRecoverySegment
            ? `Longest recovery descent runs from km ${maxRecoverySegment.startDistanceKm} to km ${maxRecoverySegment.endDistanceKm} (${maxRecoverySegment.lengthKm} km). Net descent is ${maxRecoverySegment.gainM} meters at ${maxRecoverySegment.avgGradePercent}% gradient.`
            : ''}
        </p>
      </section>

      {/* ── 12.6 What-If Simulation Section (Demarcated by Horizontal Rule) ───────── */}
      <div
        style={{
          margin: 'var(--space-24) 0 var(--space-8) 0',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-8)',
        }}
      >
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Interactive Modeling
          </span>
          <h3 style={{ fontSize: 'var(--text-h1)', marginTop: '4px' }}>What-If Detour Simulator</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', marginTop: '4px' }}>
            Simulate bypassing trail sections to test route relief and post-splice climb shifts.
          </p>
        </div>

        <DetourSelector
          points={renderPoints}
          routeId={routeId || ''}
          onSimulate={handleSimulate}
          onReset={handleResetSimulation}
          isSimulating={isSimulating}
          hasActiveSimulation={simulation != null}
        />

        {simulation && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <SimulationResults simulation={simulation} />
          </div>
        )}
      </div>

      {/* ── 12.7 Comparison Callout at End of Page ─────────────────────────────── */}
      <div
        style={{
          margin: 'var(--space-16) 0',
          padding: 'var(--space-6)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-h3)' }}>Compare Against Another Route</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', marginTop: '2px' }}>
            Benchmark this profile side-by-side with another trail or custom upload.
          </p>
        </div>
        <Link to="/compare" className="btn-ghost">
          Compare routes →
        </Link>
      </div>
    </main>
  );
}
