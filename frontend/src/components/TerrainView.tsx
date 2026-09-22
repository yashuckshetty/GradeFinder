import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import type { PointDto, SegmentDto } from '../types';

interface TerrainViewProps {
  points: PointDto[];
  climbSegment: SegmentDto | null;
  recoverySegment: SegmentDto | null;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
  onFallbackTo2D?: () => void;
}

// 5-stop topographic elevation gradient stops per Section 4 & 14
const TERRAIN_STOPS = [
  { stop: 0.0, color: new THREE.Color(0x4a5c3e) }, // deep moss
  { stop: 0.25, color: new THREE.Color(0x7c8863) }, // sage moss
  { stop: 0.50, color: new THREE.Color(0xb99a5c) }, // dry clay
  { stop: 0.75, color: new THREE.Color(0xc9642f) }, // exposed rock / terracotta
  { stop: 1.00, color: new THREE.Color(0xe8dcc8) }, // pale stone / glacier
];

const CLIMB_EMISSIVE = new THREE.Color(0xe08a34);   // Warm ember rim glow
const RECOVERY_EMISSIVE = new THREE.Color(0x4e9c93);// Glacier teal rim glow
const HOVER_GLOW = new THREE.Color(0xc9642f);       // Shared glowing cursor point

function getElevationColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < TERRAIN_STOPS.length - 1; i++) {
    const s1 = TERRAIN_STOPS[i];
    const s2 = TERRAIN_STOPS[i + 1];
    if (clamped >= s1.stop && clamped <= s2.stop) {
      const factor = (clamped - s1.stop) / (s2.stop - s1.stop);
      return s1.color.clone().lerp(s2.color, factor);
    }
  }
  return TERRAIN_STOPS[TERRAIN_STOPS.length - 1].color.clone();
}

function checkLowPowerOrMobile(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return true;
  } catch {
    return true;
  }
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 768) return true;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
  }
  return false;
}

export const TerrainView: React.FC<TerrainViewProps> = ({
  points,
  climbSegment,
  recoverySegment,
  hoverIndex,
  onHover,
  onFallbackTo2D,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exaggeration, setExaggeration] = useState<number>(3.0);
  const [isLowPower] = useState<boolean>(() => checkLowPowerOrMobile());
  const [forceFullRender, setForceFullRender] = useState<boolean>(false);

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    mesh: THREE.Mesh;
    hoverSphere: THREE.Mesh;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    lastMouse: { x: number; y: number };
    cameraAngle: number;
    cameraElevation: number;
    cameraRadius: number;
    animId: number;
  } | null>(null);

  // Scaled point array based on route distance and exaggeration
  const terrainData = useMemo(() => {
    if (points.length < 2) return null;
    const maxDist = points[points.length - 1].distanceKm;
    const minEle = Math.min(...points.map((p) => p.smoothedElevationM));
    const maxEle = Math.max(...points.map((p) => p.smoothedElevationM));
    const eleRange = maxEle - minEle || 1;

    const yMultiplier = Math.max(0.8, exaggeration * 1.2);
    const scaledPts = points.map((p) => ({
      x: (p.distanceKm / maxDist) * 10 - 5,
      y: ((p.smoothedElevationM - minEle) / eleRange) * yMultiplier,
      z: 0,
      index: p.index,
      distKm: p.distanceKm,
      ele: p.smoothedElevationM,
      normEle: (p.smoothedElevationM - minEle) / eleRange,
    }));

    return { scaledPts, minEle, maxEle, eleRange, maxDist };
  }, [points, exaggeration]);

  const isInClimb = useCallback(
    (idx: number) => {
      if (!climbSegment) return false;
      return idx >= climbSegment.startIndex && idx <= climbSegment.endIndex;
    },
    [climbSegment]
  );

  const isInRecovery = useCallback(
    (idx: number) => {
      if (!recoverySegment) return false;
      return idx >= recoverySegment.startIndex && idx <= recoverySegment.endIndex;
    },
    [recoverySegment]
  );

  useEffect(() => {
    if (!containerRef.current || !terrainData) return;
    const container = containerRef.current;
    const { scaledPts, maxDist } = terrainData;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    // Atmospheric Fog tuned to --color-background (#14120F)
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x14120f, 0.035);

    // 3/4 Isometric-ish initial camera angle
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    let cameraAngle = 0.45;
    let cameraElevation = 0.55;
    let cameraRadius = 12.0;

    const updateCameraPos = () => {
      camera.position.x = cameraRadius * Math.sin(cameraAngle) * Math.cos(cameraElevation);
      camera.position.y = cameraRadius * Math.sin(cameraElevation);
      camera.position.z = cameraRadius * Math.cos(cameraAngle) * Math.cos(cameraElevation);
      camera.lookAt(0, 0.5, 0);
    };
    updateCameraPos();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x14120f, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Build the 3D ribbon mesh using 5-stop terrain gradient
    const ribbonHalfWidth = 0.45;
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < scaledPts.length; i++) {
      const pt = scaledPts[i];
      let col = getElevationColor(pt.normEle);

      // Subtle emissive tinting for climb and recovery
      if (isInClimb(pt.index)) {
        col = col.clone().lerp(CLIMB_EMISSIVE, 0.65);
      } else if (isInRecovery(pt.index)) {
        col = col.clone().lerp(RECOVERY_EMISSIVE, 0.65);
      }

      // Left vertex
      positions.push(pt.x, pt.y, -ribbonHalfWidth);
      colors.push(col.r, col.g, col.b);

      // Right vertex
      positions.push(pt.x, pt.y, ribbonHalfWidth);
      colors.push(col.r, col.g, col.b);
    }

    const indices: number[] = [];
    for (let i = 0; i < scaledPts.length - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Ground plane with sparse logarithmic contour rings
    const ringGroup = new THREE.Group();
    const ringRadii = [2.0, 3.8, 6.0, 8.5];
    ringRadii.forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r - 0.02, r, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x332c22,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -0.5;
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // Shared glowing cursor point marker
    const sphereGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: HOVER_GLOW,
      transparent: true,
      opacity: 0.95,
    });
    const hoverSphere = new THREE.Mesh(sphereGeo, sphereMat);
    hoverSphere.visible = false;
    scene.add(hoverSphere);

    // Lighting: Warm ambient + directional key light
    const ambientLight = new THREE.AmbientLight(0xf2ede3, 0.85);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xe8dcc8, 1.2);
    dirLight.position.set(6, 10, 8);
    scene.add(dirLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };
    let animId = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();

    // Mouse drag orbit controls with damping
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        cameraAngle -= dx * 0.008;
        cameraElevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraElevation + dy * 0.008));
        updateCameraPos();
        lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }

      // Raycasting for bidirectional hover sync
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0) {
        const hitX = intersects[0].point.x;
        const targetDist = ((hitX + 5) / 10) * maxDist;

        // Binary search nearest track point
        let low = 0;
        let high = scaledPts.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (scaledPts[mid].distKm < targetDist) low = mid + 1;
          else high = mid - 1;
        }
        const nearestIdx = Math.max(0, Math.min(scaledPts.length - 1, low));
        onHover(scaledPts[nearestIdx].index);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRadius = Math.max(4.0, Math.min(22.0, cameraRadius + e.deltaY * 0.01));
      updateCameraPos();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('mousemove', onMouseMove);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    sceneRef.current = {
      renderer,
      scene,
      camera,
      mesh,
      hoverSphere,
      raycaster,
      mouse,
      isDragging,
      lastMouse,
      cameraAngle,
      cameraElevation,
      cameraRadius,
      animId,
    };

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('mousemove', onMouseMove);
      domEl.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(domEl)) container.removeChild(domEl);
    };
  }, [terrainData, isInClimb, isInRecovery, onHover]);

  // Synchronize hover point from external 2D chart or internal raycast
  useEffect(() => {
    if (!sceneRef.current || !terrainData) return;
    const { hoverSphere } = sceneRef.current;
    const { scaledPts } = terrainData;

    if (hoverIndex == null) {
      hoverSphere.visible = false;
      return;
    }

    const pt = scaledPts.find((p) => p.index === hoverIndex);
    if (pt) {
      hoverSphere.position.set(pt.x, pt.y + 0.1, 0);
      hoverSphere.visible = true;
    } else {
      hoverSphere.visible = false;
    }
  }, [hoverIndex, terrainData]);

  // Smooth camera focus on hardest climb section (1200ms ease-in-out cubic)
  const focusOnHardestSection = () => {
    if (!sceneRef.current || !terrainData || !climbSegment) return;
    const { camera } = sceneRef.current;
    const { scaledPts } = terrainData;

    const climbPts = scaledPts.filter(
      (p) => p.index >= climbSegment.startIndex && p.index <= climbSegment.endIndex
    );
    if (climbPts.length === 0) return;

    const midClimb = climbPts[Math.floor(climbPts.length / 2)];
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(midClimb.x, midClimb.y + 2.2, 5.0);

    const startTime = performance.now();
    const duration = 1200;

    const animateCamera = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // Cubic ease-in-out
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(startPos, targetPos, ease);
      camera.lookAt(midClimb.x, midClimb.y, 0);

      if (progress < 1) requestAnimationFrame(animateCamera);
    };
    requestAnimationFrame(animateCamera);
  };

  if (isLowPower && !forceFullRender) {
    return (
      <div
        className="low-power-notice"
        style={{
          padding: 'var(--space-8)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <span style={{ fontSize: '2rem' }}>⚡</span>
        <h3 style={{ fontSize: 'var(--text-h3)', color: 'var(--color-text-primary)' }}>
          High-Efficiency 2D View Active
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)', maxWidth: '420px' }}>
          Your display defaults to the fast 2D elevation chart for optimal battery and rendering speed.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {onFallbackTo2D && (
            <button type="button" className="btn-ghost" onClick={onFallbackTo2D}>
              Keep 2D Profile
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => setForceFullRender(true)}>
            Render Full 3D Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '380px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating 3D Control Overlay per Section 14 */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          background: 'rgba(28, 25, 20, 0.9)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <label
            htmlFor="exaggeration-slider"
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
            }}
          >
            Terrain emphasis: <span className="mono" style={{ color: 'var(--color-text-primary)' }}>{exaggeration.toFixed(1)}x</span>
          </label>
          <input
            id="exaggeration-slider"
            type="range"
            min={1.0}
            max={5.0}
            step={0.5}
            value={exaggeration}
            onChange={(e) => setExaggeration(Number(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
        </div>

        {climbSegment && (
          <button
            id="focus-steepest-btn"
            type="button"
            className="btn-ghost"
            onClick={focusOnHardestSection}
            style={{
              padding: '4px 8px',
              fontSize: '0.6875rem',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <span>🎯</span> Focus on hardest section
          </button>
        )}
      </div>
    </div>
  );
};

export default TerrainView;
