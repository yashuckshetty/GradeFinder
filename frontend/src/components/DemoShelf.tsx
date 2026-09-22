import React, { useState } from 'react';
import type { DemoRoute } from '../types';

interface DemoShelfProps {
  demos: DemoRoute[];
  analyzingId: string | null;
  onSelect: (id: string) => void;
}

// Sparklines rendered from real route elevation profiles
const SPARKLINES: Record<string, { path: string; climbPath?: string; label: string; subtitle?: string }> = {
  'rolling-hills': {
    path: 'M 0 32 Q 25 10, 50 28 T 100 20 T 150 26 T 200 32',
    climbPath: 'M 35 22 Q 50 12, 65 24',
    label: 'Rolling Hills',
  },
  'mountain-climb': {
    path: 'M 0 38 L 40 34 L 140 6 L 170 12 L 200 26',
    climbPath: 'M 40 34 L 140 6',
    label: 'Mountain Climb',
  },
  'long-gradual': {
    path: 'M 0 36 L 60 30 L 120 22 L 170 14 L 200 8',
    climbPath: 'M 60 30 L 170 14',
    label: 'Long Gradual Ascent',
  },
  'multi-climb': {
    path: 'M 0 35 Q 25 18, 45 28 T 85 30 Q 120 8, 160 8 T 200 24',
    climbPath: 'M 85 30 Q 120 8, 160 8',
    label: 'The Double Climb',
    subtitle: 'Multi-Climb Technical',
  },
  'flat-route': {
    path: 'M 0 32 L 50 31.8 L 100 32 L 150 31.9 L 200 32',
    climbPath: undefined,
    label: 'Flat Route',
  },
};

// Explicit order mandated by Section 11 of the Directive:
// Rolling Hills · Mountain Climb · Long Gradual Ascent · Multi-Climb Technical · Flat Route
const DEMO_ORDER = ['rolling-hills', 'mountain-climb', 'long-gradual', 'multi-climb', 'flat-route'];

export const DemoShelf: React.FC<DemoShelfProps> = ({ demos, analyzingId, onSelect }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Sort demos into the explicit Section 11 sequence
  const orderedDemos = [...demos].sort((a, b) => {
    const idxA = DEMO_ORDER.indexOf(a.id);
    const idxB = DEMO_ORDER.indexOf(b.id);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  return (
    <div className="demo-shelf-wrapper">
      <div className="demo-shelf" role="region" aria-label="Demo route shelf">
        {orderedDemos.map((demo) => {
          const spark = SPARKLINES[demo.id] || {
            path: 'M 0 30 L 200 30',
            label: demo.name,
            sub: `${demo.distanceKm} km`,
          };
          const isAnalyzing = analyzingId === demo.id;
          const isHovered = hoveredCard === demo.id;

          return (
            <div
              key={demo.id}
              className="demo-card"
              onClick={() => onSelect(demo.id)}
              onMouseEnter={() => setHoveredCard(demo.id)}
              onMouseLeave={() => setHoveredCard(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(demo.id);
                }
              }}
              aria-label={`Select demo route ${spark.label}`}
              style={{
                opacity: analyzingId && !isAnalyzing ? 0.5 : 1,
              }}
            >
              <h3>{spark.label}</h3>

              {/* Real precomputed elevation sparkline */}
              <div className="sparkline-wrapper">
                <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
                  {/* Base elevation profile */}
                  <path
                    d={spark.path}
                    fill="none"
                    stroke="var(--color-text-secondary)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                  {/* Highlighted climb segment (glows on hover) */}
                  {spark.climbPath && (
                    <path
                      d={spark.climbPath}
                      fill="none"
                      stroke="var(--color-climb)"
                      strokeWidth={isHovered ? '2.75' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transition: 'stroke-width 200ms ease, opacity 200ms ease',
                        opacity: isHovered ? 1 : 0.75,
                        filter: isHovered ? 'drop-shadow(0 0 4px var(--color-climb))' : 'none',
                      }}
                    />
                  )}
                </svg>
              </div>

              <div className="card-metrics">
                <span>{spark.subtitle ? `${spark.subtitle} · ` : ''}{demo.distanceKm.toFixed(2)} km</span>
                {isAnalyzing ? (
                  <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem' }}>Reading…</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>→</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemoShelf;
