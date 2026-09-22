import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { PointDto, SegmentDto } from '../types';

interface ElevationChartProps {
  points: PointDto[];
  climbSegment: SegmentDto | null;
  recoverySegment: SegmentDto | null;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  points,
  climbSegment,
  recoverySegment,
  hoverIndex,
  onHover,
}) => {
  const chartData = useMemo(() =>
    points.map((p) => ({
      distance: p.distanceKm,
      elevation: p.smoothedElevationM,
      rawElevation: p.elevationM,
      index: p.index,
    })),
    [points]
  );

  const minEle = useMemo(() => {
    if (chartData.length === 0) return 0;
    const min = Math.min(...chartData.map((d) => d.elevation));
    return Math.floor(min / 10) * 10 - 10;
  }, [chartData]);

  const maxEle = useMemo(() => {
    if (chartData.length === 0) return 100;
    const max = Math.max(...chartData.map((d) => d.elevation));
    return Math.ceil(max / 10) * 10 + 10;
  }, [chartData]);

  // Segment boundaries
  const climbX = useMemo(() => {
    if (!climbSegment) return null;
    return {
      x1: climbSegment.startDistanceKm,
      x2: climbSegment.endDistanceKm,
    };
  }, [climbSegment]);

  const recoveryX = useMemo(() => {
    if (!recoverySegment) return null;
    return {
      x1: recoverySegment.startDistanceKm,
      x2: recoverySegment.endDistanceKm,
    };
  }, [recoverySegment]);

  // Hover crosshair position
  const hoverDistance = useMemo(() => {
    if (hoverIndex == null) return null;
    const pt = points.find((p) => p.index === hoverIndex);
    return pt?.distanceKm ?? null;
  }, [hoverIndex, points]);

  return (
    <div
      className="chart-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(74, 92, 62, 0.06) 0%, rgba(124, 136, 99, 0.06) 50%, rgba(185, 154, 92, 0.06) 100%)',
        border: '1px solid var(--color-border)',
        padding: '12px 16px 8px 8px',
      }}
    >
      <ResponsiveContainer width="100%" height="100%" className="recharts-responsive-container">
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 20, left: 8, bottom: 8 }}
          onMouseMove={(e: any) => {
            if (e?.activePayload?.[0]?.payload) {
              onHover(e.activePayload[0].payload.index);
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <defs>
            {/* Neutral elevation fill gradient */}
            <linearGradient id="terrainNeutralGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B6355" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6B6355" stopOpacity={0.02} />
            </linearGradient>
            {/* Climb segment gradient */}
            <linearGradient id="climbFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E08A34" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E08A34" stopOpacity={0.05} />
            </linearGradient>
            {/* Recovery segment gradient */}
            <linearGradient id="recoveryFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4E9C93" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4E9C93" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          {/* Gridlines nearly invisible (30% opacity) */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.3}
            vertical={false}
          />

          <XAxis
            dataKey="distance"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            label={{
              value: 'Distance (km)',
              position: 'insideBottom',
              offset: -4,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
            }}
          />

          <YAxis
            domain={[minEle, maxEle]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}`}
            label={{
              value: 'Elevation (m)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
            }}
          />

          {/* Recovery segment highlight */}
          {recoveryX && (
            <ReferenceArea
              x1={recoveryX.x1}
              x2={recoveryX.x2}
              y1={minEle}
              y2={maxEle}
              fill="rgba(78, 156, 147, 0.15)"
              stroke="#4E9C93"
              strokeWidth={1}
              strokeDasharray="4 2"
              label={{
                value: '↘ BEST RECOVERY',
                position: 'insideTopLeft',
                fill: '#4E9C93',
                fontSize: 10,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
          )}

          {/* Climb segment highlight */}
          {climbX && (
            <ReferenceArea
              x1={climbX.x1}
              x2={climbX.x2}
              y1={minEle}
              y2={maxEle}
              fill="rgba(224, 138, 52, 0.15)"
              stroke="#E08A34"
              strokeWidth={1}
              strokeDasharray="4 2"
              label={{
                value: '↗ HARDEST CLIMB',
                position: 'insideTopLeft',
                fill: '#E08A34',
                fontSize: 10,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
          )}

          {/* Hover Crosshair (1px, --color-border-strong) */}
          {hoverDistance != null && (
            <ReferenceLine
              x={hoverDistance}
              stroke="var(--color-border-strong)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          {/* Base elevation profile area */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="rgba(242, 237, 227, 0.8)" /* --color-text-primary at 80% opacity */
            strokeWidth={2}
            fill="url(#terrainNeutralGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: 'var(--color-primary)',
              stroke: 'var(--color-background)',
              strokeWidth: 2,
            }}
            animationDuration={900}
            animationEasing="ease-out"
          />

          {/* Floating mono precision tooltip */}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    boxShadow: 'var(--shadow-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                    Kilometer {Number(data.distance).toFixed(2)} km
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Elevation:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{Number(data.elevation).toFixed(1)} m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Index:</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>#{data.index}</span>
                  </div>
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ElevationChart;
