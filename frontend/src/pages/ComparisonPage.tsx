import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { fetchDemoRoutes, compareRoutes } from '../api';
import type { DemoRoute, ComparisonResponse } from '../types';

export default function ComparisonPage() {
  const [demos, setDemos] = useState<DemoRoute[]>([]);
  const [routeAId, setRouteAId] = useState<string>('multi-climb');
  const [routeBId, setRouteBId] = useState<string>('mountain-climb');
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoRoutes().then(setDemos).catch(console.error);
  }, []);

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

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <NavLink to="/" className="back-link">← Back to Home</NavLink>
        <h2>⚔️ Route Head-to-Head Comparison</h2>
        <p>Compare topography, sustained climb efforts, and elevation profiles side-by-side</p>
      </div>

      {/* Selectors */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Select Routes to Compare</span>
        </div>
        <div className="comparison-selectors-row">
          <div className="control-group">
            <label>Route A (Primary):</label>
            <select
              value={routeAId}
              onChange={(e) => setRouteAId(e.target.value)}
              className="select-input"
            >
              {demos.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === routeBId}>
                  {d.name} ({d.distanceKm} km)
                </option>
              ))}
            </select>
          </div>

          <div className="versus-pill">VS</div>

          <div className="control-group">
            <label>Route B (Challenger):</label>
            <select
              value={routeBId}
              onChange={(e) => setRouteBId(e.target.value)}
              className="select-input"
            >
              {demos.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === routeAId}>
                  {d.name} ({d.distanceKm} km)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error / Loading */}
      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Analyzing comparative terrain models…</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <p style={{ color: '#ef4444' }}>❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {comparison && !loading && (
        <div className="comparison-results">
          {/* Natural Language Summary Banner */}
          <div className="comparison-summary-banner">
            <span className="summary-icon">💡</span>
            <div>
              <h4>Comparative Assessment</h4>
              <p>{comparison.summaryLine}</p>
            </div>
          </div>

          {/* Side-by-side Table */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Topographic Metrics Comparison</span>
            </div>
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="th-route-a">{comparison.routeA.routeName}</th>
                    <th className="th-route-b">{comparison.routeB.routeName}</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Distance</td>
                    <td>{comparison.routeA.summary.distanceKm} km</td>
                    <td>{comparison.routeB.summary.distanceKm} km</td>
                    <td>{(comparison.routeA.summary.distanceKm - comparison.routeB.summary.distanceKm).toFixed(2)} km</td>
                  </tr>
                  <tr>
                    <td>Total Elevation Gain</td>
                    <td>{comparison.routeA.summary.totalGainM} m</td>
                    <td>{comparison.routeB.summary.totalGainM} m</td>
                    <td>{(comparison.routeA.summary.totalGainM - comparison.routeB.summary.totalGainM).toFixed(1)} m</td>
                  </tr>
                  <tr>
                    <td>Highest Elevation</td>
                    <td>{comparison.routeA.summary.highestPointM} m</td>
                    <td>{comparison.routeB.summary.highestPointM} m</td>
                    <td>{(comparison.routeA.summary.highestPointM - comparison.routeB.summary.highestPointM).toFixed(1)} m</td>
                  </tr>
                  <tr>
                    <td>Average Grade</td>
                    <td>{comparison.routeA.summary.avgGradePercent}%</td>
                    <td>{comparison.routeB.summary.avgGradePercent}%</td>
                    <td>{(comparison.routeA.summary.avgGradePercent - comparison.routeB.summary.avgGradePercent).toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td>Max Climb Gain (Net)</td>
                    <td>{comparison.routeA.maxClimbSegment?.gainM ?? 0} m</td>
                    <td>{comparison.routeB.maxClimbSegment?.gainM ?? 0} m</td>
                    <td>{((comparison.routeA.maxClimbSegment?.gainM ?? 0) - (comparison.routeB.maxClimbSegment?.gainM ?? 0)).toFixed(1)} m</td>
                  </tr>
                  <tr>
                    <td>Max Climb Grade</td>
                    <td>{comparison.routeA.maxClimbSegment?.avgGradePercent ?? 0}%</td>
                    <td>{comparison.routeB.maxClimbSegment?.avgGradePercent ?? 0}%</td>
                    <td>{((comparison.routeA.maxClimbSegment?.avgGradePercent ?? 0) - (comparison.routeB.maxClimbSegment?.avgGradePercent ?? 0)).toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td>Max Climb Range</td>
                    <td>
                      {comparison.routeA.maxClimbSegment
                        ? `${comparison.routeA.maxClimbSegment.startDistanceKm}–${comparison.routeA.maxClimbSegment.endDistanceKm} km`
                        : 'None'}
                    </td>
                    <td>
                      {comparison.routeB.maxClimbSegment
                        ? `${comparison.routeB.maxClimbSegment.startDistanceKm}–${comparison.routeB.maxClimbSegment.endDistanceKm} km`
                        : 'None'}
                    </td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
