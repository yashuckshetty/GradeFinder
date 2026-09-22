import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDemoRoutes, analyzeDemo, analyzeFile } from '../api';
import type { DemoRoute } from '../types';
import HeroTerrainRibbon from '../components/HeroTerrainRibbon';
import DemoShelf from '../components/DemoShelf';
import PurposefulLoading from '../components/PurposefulLoading';
import BrandLogo from '../components/BrandLogo';

export default function HomePage() {
  const navigate = useNavigate();
  const [demos, setDemos] = useState<DemoRoute[]>([]);
  const [, setLoadingInitial] = useState(true);
  const [analyzingTarget, setAnalyzingTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDemoRoutes()
      .then(setDemos)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingInitial(false));
  }, []);

  const handleSelectDemo = async (id: string) => {
    setAnalyzingTarget(id);
    setError(null);
    try {
      const result = await analyzeDemo(id);
      sessionStorage.setItem(`analysis-${result.routeId}`, JSON.stringify(result));
      // Give purposeful loading animation time to conclude smoothly
      setTimeout(() => {
        navigate(`/analyze/${result.routeId}`);
      }, 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to analyze demo route');
      setAnalyzingTarget(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError("Please upload a .gpx file — GradeFinder requires GPX coordinate and elevation data to read terrain.");
      return;
    }
    setAnalyzingTarget('upload');
    setError(null);
    try {
      const result = await analyzeFile(file);
      sessionStorage.setItem(`analysis-${result.routeId}`, JSON.stringify(result));
      setTimeout(() => {
        navigate(`/analyze/${result.routeId}`);
      }, 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'We couldn’t read this GPX file.');
      setAnalyzingTarget(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  if (analyzingTarget) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <PurposefulLoading />
      </div>
    );
  }

  return (
    <main className="page-container">
      {/* ── 9. Hero Section (Asymmetric 12-column layout) ─────────────────────────── */}
      <section
        className="hero-section"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'center',
          minHeight: '75vh',
          padding: 'var(--space-8) 0',
          position: 'relative',
        }}
      >
        {/* Copy (Cols 1-6 desktop) */}
        <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', zIndex: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-climb)',
            }}
          >
            FIND THE CLIMB THAT MATTERS
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-hero)',
              fontWeight: 600,
              lineHeight: 1.08,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            See where your route <em style={{ fontWeight: 400, fontStyle: 'italic' }}>actually</em> gets hard.
          </h1>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-body-lg)',
              lineHeight: 1.6,
              maxWidth: '520px',
            }}
          >
            Not an estimate. Not a guess from a length-and-grade rule of thumb. The exact section
            of your route where the climbing is genuinely sustained — computed, not eyeballed.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <a
              href="#upload-section"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Analyze a route
            </a>
            <a
              href="#routes-section"
              className="btn-ghost"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('routes-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore a demo route
            </a>
          </div>
        </div>

        {/* Hero WebGL Elevation Ribbon (Cols 7-12 desktop) */}
        <div
          style={{
            gridColumn: 'span 6',
            height: '480px',
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <HeroTerrainRibbon />
        </div>
      </section>

      {/* ── 8.3 "How It Works" 3-Step Sequence ─────────────────────────────────── */}
      <section
        style={{
          margin: 'var(--space-24) 0',
          padding: 'var(--space-8) 0',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Methodology
          </span>
          <h3 style={{ fontSize: 'var(--text-h1)', marginTop: '4px' }}>How it works</h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-8)',
          }}
        >
          <div>
            <span className="mono" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-metric-sm)', fontWeight: 600 }}>01</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>Upload your route</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>
              Provide any recorded GPX track. GradeFinder smoothes altitude jitter via moving-average filtration without erasing legitimate short pitches.
            </p>
          </div>

          <div>
            <span className="mono" style={{ color: 'var(--color-climb)', fontSize: 'var(--text-metric-sm)', fontWeight: 600 }}>02</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>We find the real climb</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>
              A mathematically proven tolerance-modified Kadane engine extracts the globally optimal sustained climbing interval in linear $O(N)$ time.
            </p>
          </div>

          <div>
            <span className="mono" style={{ color: 'var(--color-secondary)', fontSize: 'var(--text-metric-sm)', fontWeight: 600 }}>03</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>See exactly where it happens</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>
              Explore the climb across interactive 2D profile and 3D terrain ribbon views with synchronized telemetry, what-if detour simulation, and head-to-head route comparisons.
            </p>
          </div>
        </div>
      </section>

      {/* ── 10. Large Upload Dropzone (280px) ─────────────────────────────────── */}
      <section id="upload-section" style={{ margin: 'var(--space-24) 0' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Route Input
          </span>
          <h2 style={{ fontSize: 'var(--text-h1)', marginTop: '4px' }}>Analyze Your Route's Toughest Climbs</h2>
        </div>

        <div
          className={`dropzone-container ${dragActive ? 'drag-active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload GPX route file"
        >
          {/* Concentric contour ripple ring */}
          <div className="dropzone-ripple-ring" />

          <BrandLogo size={28} showWordmark={false} />

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', color: 'var(--color-text-primary)' }}>
            Drop your GPX file here
          </p>

          <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
            or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse files</span>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </div>

        {/* Humanized Error State */}
        {error && (
          <div className="error-banner">
            <h3>We couldn’t read this file</h3>
            <p>{error}</p>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <button className="btn-ghost" onClick={() => setError(null)}>
                Try another file
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 11. Demo Route Shelf (Explicit Order) ─────────────────────────────── */}
      <section id="routes-section" style={{ margin: 'var(--space-24) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reference Catalog
            </span>
            <h3 style={{ fontSize: 'var(--text-h1)', marginTop: '4px' }}>Explore a demo route</h3>
          </div>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            5 synthetic profiles
          </span>
        </div>

        <DemoShelf
          demos={demos}
          analyzingId={analyzingTarget}
          onSelect={handleSelectDemo}
        />
      </section>

      {/* ── 8.5 Algorithm Credibility Strip ───────────────────────────────────── */}
      <section
        style={{
          margin: 'var(--space-24) 0 var(--space-12) 0',
          padding: 'var(--space-6) var(--space-8)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-6)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 'var(--text-metric)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
            O(n²) → O(n)
          </span>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            Algorithmic Complexity
          </p>
        </div>

        <div style={{ height: '32px', width: '1px', background: 'var(--color-border)' }} />

        <div style={{ textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 'var(--text-metric)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
            &lt; 15 ms
          </span>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            P90 2,000-Point Latency
          </p>
        </div>

        <div style={{ height: '32px', width: '1px', background: 'var(--color-border)' }} />

        <div style={{ textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 'var(--text-metric)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
            Linear
          </span>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            Memory Scaling
          </p>
        </div>
      </section>

      {/* ── 8.7 Footer ────────────────────────────────────────────────────────── */}
      <footer
        id="about-section"
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-8) 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <BrandLogo size={24} showWordmark={true} />
        <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
          Built with Java + Kadane's algorithm · Grounded · Precise · Warm · Unhurried · Alive
        </p>
      </footer>
    </main>
  );
}
