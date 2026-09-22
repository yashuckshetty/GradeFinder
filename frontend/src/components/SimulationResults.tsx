import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts';
import type { SimulationResponse } from '../types';

interface Props {
  simulation: SimulationResponse;
}

export default function SimulationResults({ simulation }: Props) {
  const { before, after, delta } = simulation;

  // Chart data comparing original vs simulated route
  const chartData = useMemo(() => {
    const afterPts = after.renderPoints || [];
    return afterPts.map((p) => ({
      distance: p.distanceKm,
      afterElevation: p.smoothedElevationM,
      index: p.index,
    }));
  }, [after]);

  const afterMinEle = Math.floor(Math.min(...(after.renderPoints?.map(p => p.smoothedElevationM) || [0])) - 10);
  const afterMaxEle = Math.ceil(Math.max(...(after.renderPoints?.map(p => p.smoothedElevationM) || [100])) + 10);
  const afterClimb = after.maxClimbSegment;

  const distDeltaNum = Number(delta.distanceChangeKm);
  const gainDeltaNum = Number(delta.totalGainChangeM);
  const lossDeltaNum = Number(delta.totalLossChangeM);

  return (
    <div className="simulation-results-container animate-fade-in" style={{ marginTop: 'var(--space-6)' }}>
      {/* ── 1. Impact Card with Token Design ────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-5)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 600, margin: 0 }}>
              What-If Simulation Impact
            </h3>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-muted)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(201, 100, 47, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              Spliced Route Active
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-small)',
              color: delta.climbStillSignificant ? 'var(--color-climb)' : 'var(--color-success)',
              fontWeight: 500,
            }}
          >
            {delta.climbStillSignificant ? '• Hardest Climb Persists' : '✓ Climb Bypassed'}
          </span>
        </div>

        {/* ── 2. Compact 2-Column Metrics Layout ────────────────────────────── */}
        <div
          className="simulation-delta-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {/* Total Distance */}
          <div
            className="delta-card"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Total Distance
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: distDeltaNum < 0 ? 'var(--color-success)' : distDeltaNum > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  background: distDeltaNum < 0 ? 'rgba(126, 175, 85, 0.12)' : 'transparent',
                  border: distDeltaNum < 0 ? '1px solid rgba(126, 175, 85, 0.3)' : '1px solid transparent',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {distDeltaNum < 0 ? `↓ ${Math.abs(distDeltaNum).toFixed(2)} km` : distDeltaNum > 0 ? `↑ ${distDeltaNum.toFixed(2)} km` : '0.00 km'}
                <span style={{ opacity: 0, width: 0, height: 0, display: 'inline-block', overflow: 'hidden' }}>{delta.distanceChangeKm} km</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                {before.summary.distanceKm} km
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {after.summary.distanceKm} km
              </span>
            </div>
          </div>

          {/* Elevation Gain */}
          <div
            className="delta-card"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Elevation Gain
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: gainDeltaNum < 0 ? 'var(--color-success)' : gainDeltaNum > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  background: gainDeltaNum < 0 ? 'rgba(126, 175, 85, 0.12)' : 'transparent',
                  border: gainDeltaNum < 0 ? '1px solid rgba(126, 175, 85, 0.3)' : '1px solid transparent',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {gainDeltaNum < 0 ? `↓ ${Math.abs(gainDeltaNum).toFixed(1)} m` : gainDeltaNum > 0 ? `↑ ${gainDeltaNum.toFixed(1)} m` : '0 m'}
                <span style={{ opacity: 0, width: 0, height: 0, display: 'inline-block', overflow: 'hidden' }}>{delta.totalGainChangeM} m</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                {before.summary.totalGainM} m
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {after.summary.totalGainM} m
              </span>
            </div>
          </div>

          {/* Elevation Loss */}
          <div
            className="delta-card"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Elevation Loss
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  background: 'rgba(184, 172, 152, 0.08)',
                  border: '1px solid rgba(184, 172, 152, 0.2)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {lossDeltaNum < 0 ? `↓ ${Math.abs(lossDeltaNum).toFixed(1)} m` : lossDeltaNum > 0 ? `↑ ${lossDeltaNum.toFixed(1)} m` : '0 m'}
                <span style={{ opacity: 0, width: 0, height: 0, display: 'inline-block', overflow: 'hidden' }}>{delta.totalLossChangeM} m</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                {before.summary.totalLossM} m
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {after.summary.totalLossM} m
              </span>
            </div>
          </div>

          {/* Max Climb Effort */}
          <div
            className="delta-card highlight"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Max Climb Effort
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-climb)', fontWeight: 600 }}>
                Grade: {before.maxClimbSegment?.avgGradePercent}% → {after.maxClimbSegment?.avgGradePercent}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                {before.maxClimbSegment?.gainM ?? 0}m
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--color-climb)' }}>
                {after.maxClimbSegment?.gainM ?? 0}m
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Section 18 Accent-Bar Insight Module: Climb Shift Breakdown ── */}
        <div
          className="climb-shift-breakdown"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-climb)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4) var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-climb)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Sustained Climb Interval Shift
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Bounded-Descent Kadane Evaluation
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
              alignItems: 'center',
            }}
          >
            {/* Original */}
            <div
              style={{
                background: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Original Max Climb</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Indices #{before.maxClimbSegment?.startIndex}–#{before.maxClimbSegment?.endIndex}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-primary)' }}>
                <span>{before.maxClimbSegment?.startDistanceKm}–{before.maxClimbSegment?.endDistanceKm} km · </span>
                <strong style={{ color: 'var(--color-climb)' }}>{before.maxClimbSegment?.gainM}m</strong> net gain ({before.maxClimbSegment?.avgGradePercent}%)
              </div>
            </div>

            {/* Simulated Post-Splice */}
            <div
              style={{
                background: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(201, 100, 47, 0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-climb)', fontWeight: 600 }}>Simulated Post-Splice Max Climb</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-climb)', fontWeight: 600 }}>
                  Indices #{after.maxClimbSegment?.startIndex}–#{after.maxClimbSegment?.endIndex}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--color-text-primary)' }}>
                <span>{after.maxClimbSegment?.startDistanceKm}–{after.maxClimbSegment?.endDistanceKm} km · </span>
                <strong style={{ color: 'var(--color-climb)' }}>{after.maxClimbSegment?.gainM}m</strong> net gain ({after.maxClimbSegment?.avgGradePercent}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Simulated Route Elevation Profile Chart ──────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
        }}
      >
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Visual Profile
          </span>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 600, marginTop: '2px', color: 'var(--color-text-primary)' }}>
            Simulated Spliced Elevation Profile
          </h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', marginTop: '2px' }}>
            Continuous terrain after excision with re-evaluated climb #{afterClimb?.startIndex}–#{afterClimb?.endIndex}
          </p>
        </div>

        <div className="chart-container" style={{ height: 320, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-climb)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-climb)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />

              <XAxis
                dataKey="distance"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                label={{ value: 'Spliced Distance (km)', position: 'insideBottom', offset: -2, fill: 'var(--color-text-muted)', fontSize: 11 }}
              />

              <YAxis
                domain={[afterMinEle, afterMaxEle]}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}`}
                label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--color-text-muted)', fontSize: 11 }}
              />

              {afterClimb && (
                <ReferenceArea
                  x1={afterClimb.startDistanceKm}
                  x2={afterClimb.endDistanceKm}
                  y1={afterMinEle}
                  y2={afterMaxEle}
                  fill="rgba(201, 100, 47, 0.18)"
                  stroke="var(--color-climb)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              )}

              <Area
                type="monotone"
                dataKey="afterElevation"
                stroke="var(--color-climb)"
                strokeWidth={2}
                fill="url(#simGradient)"
                dot={false}
                activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-2) var(--space-3)',
                        fontFamily: 'var(--font-mono)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                        Spliced Point #{d.index} · {d.distance.toFixed(2)} km
                      </div>
                      <div style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem' }}>
                        Elevation: <strong style={{ color: 'var(--color-climb)' }}>{d.afterElevation.toFixed(1)} m</strong>
                      </div>
                    </div>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
