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
    // Generate an overlay profile by distance
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

  return (
    <div className="simulation-results-container animate-fade-in">
      <div className="card" style={{ borderColor: 'var(--accent-primary)', marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-title">📊 What-If Simulation Impact</span>
            <span className="badge-pill active">Spliced Route Active</span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {delta.climbStillSignificant ? '✓ Hardest Climb Persists' : '⚠ Climb Eliminated'}
          </span>
        </div>

        {/* Delta Metrics Grid */}
        <div className="simulation-delta-grid">
          <div className="delta-card">
            <span className="delta-label">Total Distance</span>
            <div className="delta-values">
              <span className="val-before">{before.summary.distanceKm} km</span>
              <span className="val-arrow">→</span>
              <span className="val-after">{after.summary.distanceKm} km</span>
            </div>
            <span className={`delta-diff ${Number(delta.distanceChangeKm) < 0 ? 'good' : ''}`}>
              {Number(delta.distanceChangeKm) > 0 ? `+${delta.distanceChangeKm}` : delta.distanceChangeKm} km
            </span>
          </div>

          <div className="delta-card">
            <span className="delta-label">Elevation Gain</span>
            <div className="delta-values">
              <span className="val-before">{before.summary.totalGainM} m</span>
              <span className="val-arrow">→</span>
              <span className="val-after">{after.summary.totalGainM} m</span>
            </div>
            <span className={`delta-diff ${Number(delta.totalGainChangeM) < 0 ? 'good' : ''}`}>
              {Number(delta.totalGainChangeM) > 0 ? `+${delta.totalGainChangeM}` : delta.totalGainChangeM} m
            </span>
          </div>

          <div className="delta-card">
            <span className="delta-label">Elevation Loss</span>
            <div className="delta-values">
              <span className="val-before">{before.summary.totalLossM} m</span>
              <span className="val-arrow">→</span>
              <span className="val-after">{after.summary.totalLossM} m</span>
            </div>
            <span className={`delta-diff ${Number(delta.totalLossChangeM) < 0 ? 'good' : ''}`}>
              {Number(delta.totalLossChangeM) > 0 ? `+${delta.totalLossChangeM}` : delta.totalLossChangeM} m
            </span>
          </div>

          <div className="delta-card highlight">
            <span className="delta-label">Max Climb Effort</span>
            <div className="delta-values">
              <span className="val-before">{before.maxClimbSegment?.gainM ?? 0} m</span>
              <span className="val-arrow">→</span>
              <span className="val-after">{after.maxClimbSegment?.gainM ?? 0} m</span>
            </div>
            <span className="delta-subtext">
              Grade: {before.maxClimbSegment?.avgGradePercent}% → {after.maxClimbSegment?.avgGradePercent}%
            </span>
          </div>
        </div>

        {/* Max Climb Shift Breakdown */}
        <div className="climb-shift-breakdown" style={{ marginTop: 16 }}>
          <div className="shift-row">
            <div className="shift-col">
              <span className="shift-tag before">Original Max Climb</span>
              <p className="shift-desc">
                Indices #{before.maxClimbSegment?.startIndex}–#{before.maxClimbSegment?.endIndex} ({before.maxClimbSegment?.startDistanceKm}–{before.maxClimbSegment?.endDistanceKm} km)
              </p>
              <div className="shift-stats">
                <span>Net Gain: <strong>{before.maxClimbSegment?.gainM}m</strong></span>
                <span>Cumulative: <strong>{before.maxClimbSegment?.totalAscentM}m</strong></span>
                <span>Grade: <strong>{before.maxClimbSegment?.avgGradePercent}%</strong></span>
              </div>
            </div>

            <div className="shift-arrow-divider">➔</div>

            <div className="shift-col after">
              <span className="shift-tag after">Simulated Post-Splice Max Climb</span>
              <p className="shift-desc">
                Indices #{after.maxClimbSegment?.startIndex}–#{after.maxClimbSegment?.endIndex} ({after.maxClimbSegment?.startDistanceKm}–{after.maxClimbSegment?.endDistanceKm} km)
              </p>
              <div className="shift-stats">
                <span>Net Gain: <strong>{after.maxClimbSegment?.gainM}m</strong></span>
                <span>Cumulative: <strong>{after.maxClimbSegment?.totalAscentM}m</strong></span>
                <span>Grade: <strong>{after.maxClimbSegment?.avgGradePercent}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Route Elevation Profile */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Simulated Spliced Elevation Profile</span>
          <span className="card-subtitle">
            Showing continuous spliced terrain with new segment indices #{afterClimb?.startIndex}–#{afterClimb?.endIndex}
          </span>
        </div>

        <div className="chart-container" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

              <XAxis
                dataKey="distance"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                label={{ value: 'Spliced Distance (km)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
              />

              <YAxis
                domain={[afterMinEle, afterMaxEle]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}`}
                label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
              />

              {afterClimb && (
                <ReferenceArea
                  x1={afterClimb.startDistanceKm}
                  x2={afterClimb.endDistanceKm}
                  y1={afterMinEle}
                  y2={afterMaxEle}
                  fill="rgba(245, 158, 11, 0.15)"
                  stroke="rgba(245, 158, 11, 0.5)"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}

              <Area
                type="monotone"
                dataKey="afterElevation"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#simGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#0a0e17', strokeWidth: 2 }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="custom-tooltip">
                      <div className="tooltip-title">Spliced Point #{d.index} · {d.distance.toFixed(2)} km</div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Simulated Elevation:</span>
                        <span className="tooltip-value">{d.afterElevation.toFixed(1)} m</span>
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
