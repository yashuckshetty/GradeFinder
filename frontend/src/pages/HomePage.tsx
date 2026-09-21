import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDemoRoutes, analyzeDemo, analyzeFile } from '../api';
import type { DemoRoute } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const [demos, setDemos] = useState<DemoRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDemoRoutes()
      .then(setDemos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDemoClick = async (id: string) => {
    setAnalyzing(id);
    setError(null);
    try {
      const result = await analyzeDemo(id);
      // Store result for the analysis page
      sessionStorage.setItem(`analysis-${result.routeId}`, JSON.stringify(result));
      navigate(`/analyze/${result.routeId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setAnalyzing(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.gpx')) {
      setError('Please upload a .gpx file');
      return;
    }
    setAnalyzing('upload');
    setError(null);
    try {
      const result = await analyzeFile(file);
      sessionStorage.setItem(`analysis-${result.routeId}`, JSON.stringify(result));
      navigate(`/analyze/${result.routeId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setAnalyzing(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading demo routes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Analyze Your Route's Toughest Climbs
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', fontSize: '0.9375rem' }}>
          Upload a GPX file or select a demo route to detect the hardest sustained climb
          using our tolerance-based Kadane algorithm.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-area${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📂</div>
        <h3>Upload GPX File</h3>
        <p>Drag and drop or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="error-container" style={{ marginTop: 16 }}>
          <div className="error-icon">❌</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Demo Routes */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4 }}>Demo Routes</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
          Pre-loaded synthetic routes designed to exercise specific algorithm behaviors
        </p>
        <div className="demo-grid">
          {demos.map(d => (
            <div
              key={d.id}
              className="demo-card"
              onClick={() => !analyzing && handleDemoClick(d.id)}
              style={{ opacity: analyzing && analyzing !== d.id ? 0.5 : 1 }}
            >
              {analyzing === d.id && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                </div>
              )}
              {analyzing !== d.id && (
                <span className="distance-badge">{d.distanceKm} km</span>
              )}
              <h3>{d.name}</h3>
              <p>{d.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
