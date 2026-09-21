import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { PointDto, SegmentDto } from '../types';

interface Props {
  points: PointDto[];
  climbSegment: SegmentDto | null;
  recoverySegment: SegmentDto | null;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
}

export default function ElevationChart({ points, climbSegment, recoverySegment, hoverIndex, onHover }: Props) {
  const chartData = useMemo(() =>
    points.map(p => ({
      distance: p.distanceKm,
      elevation: p.smoothedElevationM,
      rawElevation: p.elevationM,
      index: p.index,
    })),
    [points]
  );

  const minEle = useMemo(() => {
    const min = Math.min(...chartData.map(d => d.elevation));
    return Math.floor(min / 10) * 10 - 10;
  }, [chartData]);

  const maxEle = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.elevation));
    return Math.ceil(max / 10) * 10 + 10;
  }, [chartData]);

  // Find the chart x-values (distanceKm) for segment boundaries
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

  // Find distance for hover crosshair
  const hoverDistance = useMemo(() => {
    if (hoverIndex == null) return null;
    const pt = points.find(p => p.index === hoverIndex);
    return pt?.distanceKm ?? null;
  }, [hoverIndex, points]);

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          onMouseMove={(e: any) => {
            if (e?.activePayload?.[0]?.payload) {
              onHover(e.activePayload[0].payload.index);
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="distance"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
          />

          <YAxis
            domain={[minEle, maxEle]}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}`}
            label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
          />

          {/* Recovery segment highlight (behind climb) */}
          {recoveryX && (
            <ReferenceArea
              x1={recoveryX.x1}
              x2={recoveryX.x2}
              y1={minEle}
              y2={maxEle}
              fill="rgba(6, 182, 212, 0.12)"
              stroke="rgba(6, 182, 212, 0.4)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* Climb segment highlight */}
          {climbX && (
            <ReferenceArea
              x1={climbX.x1}
              x2={climbX.x2}
              y1={minEle}
              y2={maxEle}
              fill="rgba(245, 158, 11, 0.12)"
              stroke="rgba(245, 158, 11, 0.4)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* Hover crosshair */}
          {hoverDistance != null && (
            <ReferenceLine
              x={hoverDistance}
              stroke="#ffffff"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}

          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#elevGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: '#818cf8',
              stroke: '#0a0e17',
              strokeWidth: 2,
            }}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="custom-tooltip">
                  <div className="tooltip-title">Distance: {d.distance.toFixed(2)} km</div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Smoothed</span>
                    <span className="tooltip-value">{d.elevation.toFixed(1)} m</span>
                  </div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Raw</span>
                    <span className="tooltip-value">{d.rawElevation.toFixed(1)} m</span>
                  </div>
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
