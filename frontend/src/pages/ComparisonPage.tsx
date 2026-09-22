import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchDemoRoutes, compareRoutes, analyzeFile } from '../api';
import type { DemoRoute, ComparisonResponse } from '../types';
import PurposefulLoading from '../components/PurposefulLoading';

export default function ComparisonPage() {
  const [demos, setDemos] = useState<DemoRoute[]>([]);
  const [customRoutes, setCustomRoutes] = useState<DemoRoute[]>([]);
  const [routeAId, setRouteAId] = useState<string>('multi-climb');
  const [routeBId, setRouteBId] = useState<string>('mountain-climb');
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDemoRoutes().then(setDemos).catch(console.error);
  }, []);

  const allAvailableRoutes = [...demos, ...customRoutes];

  const handleUploadForRoute = async (file: File, target: 'A' | 'B') => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('Please upload a valid .gpx file');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeFile(file);
      const newRoute: DemoRoute = {
        id: res.routeId,
        name: `${file.name.replace(/\.gpx$/i, '')}`,
        description: 'Uploaded custom GPX track',
        distanceKm: res.summary.distanceKm,
      };
      setCustomRoutes((prev) => [...prev.filter((r) => r.id !== res.routeId), newRoute]);
      if (target === 'A') setRouteAId(res.routeId);
      else setRouteBId(res.routeId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'File upload failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!routeAId || !routeBId || routeAId === routeBId) return;
    setLoading(true);
    setError(null);
    compareRoutes(routeAId, routeBId)
      .then((res) => {
        setComparison(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Comparison failed');
        setLoading(false);
      });
  }, [routeAId, routeBId]);

  // Normalized (0-100% distance) overlay chart data
  const normalizedChartData = React.useMemo(() => {
    if (!comparison) return [];
    const ptsA = comparison.routeA.renderPoints || [];
    const ptsB = comparison.routeB.renderPoints || [];
    const maxDistA = comparison.routeA.summary.distanceKm || 1;
    const maxDistB = comparison.routeB.summary.distanceKm || 1;

    const samples = 100;
    const data = [];
    for (let i = 0; i <= samples; i++) {
      const pct = (i / samples) * 100;
      const targetDistA = (pct / 100) * maxDistA;
      const targetDistB = (pct / 100) * maxDistB;

      const ptA = ptsA.reduce((prev, curr) =>
        Math.abs(curr.distanceKm - targetDistA) < Math.abs(prev.distanceKm - targetDistA) ? curr : prev,
        ptsA[0] || { smoothedElevationM: 0 }
      );
      const ptB = ptsB.reduce((prev, curr) =>
        Math.abs(curr.distanceKm - targetDistB) < Math.abs(prev.distanceKm - targetDistB) ? curr : prev,
        ptsB[0] || { smoothedElevationM: 0 }
      );

      data.push({
        percent: pct,
        elevationA: ptA.smoothedElevationM,
        elevationB: ptB.smoothedElevationM,
      });
    }
    return data;
  }, [comparison]);

  const selectedRouteA = allAvailableRoutes.find((r) => r.id === routeAId);
  const selectedRouteB = allAvailableRoutes.find((r) => r.id === routeBId);

  return (
    <main className="page-container">
      {/* ── Page Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <NavLink
          to="/"
          className="btn-ghost"
          style={{ padding: '4px 12px', fontSize: 'var(--text-small)', marginBottom: 'var(--space-3)' }}
        >
          ← Back to Catalog
        </NavLink>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', marginTop: 'var(--space-2)' }}>
          Route Head-to-Head Comparison
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', marginTop: '4px' }}>
          Compare topography, sustained climb efforts, and elevation profiles side-by-side on a normalized shared axis.
        </p>
      </div>

      {/* ── 17. Two Route-Selector Slots Side by Side (Compact Demo-Card Slots) ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 'var(--space-4)',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Slot A */}
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Slot A · Solid Line
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 'var(--text-caption)', padding: '2px 8px' }}
              onClick={() => fileInputARef.current?.click()}
            >
              Upload GPX
            </button>
            <input
              ref={fileInputARef}
              type="file"
              accept=".gpx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadForRoute(f, 'A');
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 600 }}>
              {selectedRouteA?.name || 'Select Route A'}
            </span>
            <span className="mono" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-small)', fontWeight: 600 }}>
              {selectedRouteA ? `${selectedRouteA.distanceKm.toFixed(2)} km` : ''}
            </span>
          </div>

          {/* Compact visual shelf picker for Slot A */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {allAvailableRoutes.map((r) => {
              const isSelected = r.id === routeAId;
              const isDisabled = r.id === routeBId;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setRouteAId(r.id)}
                  style={{
                    flex: '0 0 auto',
                    padding: '4px 8px',
                    fontSize: '0.6875rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isSelected ? 'var(--color-primary-muted)' : 'var(--color-surface-raised)',
                    color: isSelected ? 'var(--color-primary)' : isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {r.name} ({r.distanceKm.toFixed(2)} km)
                </button>
              );
            })}
          </div>
        </div>

        {/* Versus Divider */}
        <span
          className="versus-pill"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption)',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          VS
        </span>

        {/* Slot B */}
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Slot B · Dashed Line
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 'var(--text-caption)', padding: '2px 8px' }}
              onClick={() => fileInputBRef.current?.click()}
            >
              Upload GPX
            </button>
            <input
              ref={fileInputBRef}
              type="file"
              accept=".gpx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadForRoute(f, 'B');
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 600 }}>
              {selectedRouteB?.name || 'Select Route B'}
            </span>
            <span className="mono" style={{ color: 'var(--color-secondary)', fontSize: 'var(--text-small)', fontWeight: 600 }}>
              {selectedRouteB ? `${selectedRouteB.distanceKm.toFixed(2)} km` : ''}
            </span>
          </div>

          {/* Compact visual shelf picker for Slot B */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {allAvailableRoutes.map((r) => {
              const isSelected = r.id === routeBId;
              const isDisabled = r.id === routeAId;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setRouteBId(r.id)}
                  style={{
                    flex: '0 0 auto',
                    padding: '4px 8px',
                    fontSize: '0.6875rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-secondary)' : 'var(--color-border)',
                    background: isSelected ? 'rgba(124, 136, 99, 0.15)' : 'var(--color-surface-raised)',
                    color: isSelected ? 'var(--color-secondary)' : isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {r.name} ({r.distanceKm.toFixed(2)} km)
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="error-banner">
          <h3>Comparison Error</h3>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-12) 0' }}>
          <PurposefulLoading />
        </div>
      )}

      {/* ── Results Container ─────────────────────────────────────────────────── */}
      {comparison && !loading && (
        <div>
          {/* 17. Verdict Banner Situated Above Chart per Section 17 */}
          <div
            className="comparison-summary-banner"
            style={{
              background: 'var(--color-surface)',
              borderLeft: '4px solid var(--color-climb)',
              borderTop: '1px solid var(--color-border)',
              borderRight: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4) var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-body-lg)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.5,
              }}
            >
              {comparison.summaryLine}
            </p>
          </div>

          {/* Normalized Shared-Axis Overlay Chart */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Normalized Elevation Profile (0–100% Course Progress)
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-caption)' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>― {comparison.routeA.routeName} (Solid)</span>
                <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>╌ {comparison.routeB.routeName} (Dashed)</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedChartData} margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="percent"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      return (
                        <div
                          style={{
                            background: 'var(--color-surface-raised)',
                            border: '1px solid var(--color-border-strong)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            Course: {payload[0].payload.percent}%
                          </div>
                          <div style={{ color: 'var(--color-primary)' }}>
                            {comparison.routeA.routeName}: {Number(payload[0].payload.elevationA).toFixed(1)} m
                          </div>
                          <div style={{ color: 'var(--color-secondary)' }}>
                            {comparison.routeB.routeName}: {Number(payload[0].payload.elevationB).toFixed(1)} m
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elevationA"
                    stroke="#C9642F"
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="elevationB"
                    stroke="#7C8863"
                    strokeWidth={2.2}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metric Table Beneath */}
          <div
            className="comparison-table-wrapper"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <table className="comparison-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-raised)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                    Metric
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-primary)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                    {comparison.routeA.routeName} (A)
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-secondary)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                    {comparison.routeB.routeName} (B)
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                    Delta (B − A)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>Total Distance</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeA.summary.distanceKm} km</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeB.summary.distanceKm} km</td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {(comparison.routeB.summary.distanceKm - comparison.routeA.summary.distanceKm).toFixed(2)} km
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>Total Elevation Gain</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeA.summary.totalGainM} m</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeB.summary.totalGainM} m</td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--color-climb)' }}>
                    {(comparison.routeB.summary.totalGainM - comparison.routeA.summary.totalGainM).toFixed(2)} m
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>Max Climb Gain</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeA.maxClimbSegment?.gainM ?? 0} m</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeB.maxClimbSegment?.gainM ?? 0} m</td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--color-climb)' }}>
                    {((comparison.routeB.maxClimbSegment?.gainM ?? 0) - (comparison.routeA.maxClimbSegment?.gainM ?? 0)).toFixed(2)} m
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>Max Climb Avg Grade</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeA.maxClimbSegment?.avgGradePercent ?? 0}%</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeB.maxClimbSegment?.avgGradePercent ?? 0}%</td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {((comparison.routeB.maxClimbSegment?.avgGradePercent ?? 0) - (comparison.routeA.maxClimbSegment?.avgGradePercent ?? 0)).toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px' }}>Highest Point</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeA.summary.highestPointM} m</td>
                  <td className="mono" style={{ padding: '12px 16px' }}>{comparison.routeB.summary.highestPointM} m</td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {(comparison.routeB.summary.highestPointM - comparison.routeA.summary.highestPointM).toFixed(1)} m
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
