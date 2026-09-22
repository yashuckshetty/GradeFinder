import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// Real synthetic points for multi-climb route (approx 57 points)
const MULTI_CLIMB_PTS: { x: number; y: number }[] = [
  { x: 0.00, y: 500 }, { x: 0.15, y: 501 }, { x: 0.30, y: 502 }, { x: 0.45, y: 504 },
  { x: 0.60, y: 507 }, { x: 0.75, y: 512 }, { x: 0.90, y: 520 }, { x: 1.05, y: 532 },
  { x: 1.20, y: 548 }, { x: 1.35, y: 566 }, { x: 1.50, y: 585 }, { x: 1.65, y: 594 },
  { x: 1.80, y: 597 }, { x: 1.95, y: 595 }, { x: 2.10, y: 588 }, { x: 2.25, y: 576 },
  { x: 2.40, y: 560 }, { x: 2.55, y: 542 }, { x: 2.70, y: 526 }, { x: 2.85, y: 516 },
  { x: 3.00, y: 510 }, { x: 3.15, y: 509 }, { x: 3.30, y: 510 }, { x: 3.45, y: 511 },
  // Hardest climb segment runs from 3.15 km to 6.71 km (indices 22-48)
  { x: 3.60, y: 513 }, { x: 3.75, y: 517 }, { x: 3.90, y: 522 }, { x: 4.05, y: 529 },
  { x: 4.20, y: 538 }, { x: 4.35, y: 549 }, { x: 4.50, y: 561 }, { x: 4.65, y: 574 },
  { x: 4.80, y: 586 }, { x: 4.95, y: 596 }, { x: 5.10, y: 604 }, { x: 5.25, y: 610 },
  { x: 5.40, y: 614 }, { x: 5.55, y: 616 }, { x: 5.70, y: 618 }, { x: 5.85, y: 620 },
  { x: 6.00, y: 622 }, { x: 6.15, y: 624 }, { x: 6.30, y: 627 }, { x: 6.45, y: 631 },
  { x: 6.60, y: 635 }, { x: 6.71, y: 637 }, { x: 6.90, y: 630 }, { x: 7.10, y: 615 },
  { x: 7.30, y: 595 }, { x: 7.50, y: 585 }, { x: 7.67, y: 580 },
];

export const HeroTerrainRibbon: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [, setHovered] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x14120f, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 9);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Build the elevation ribbon geometry
    const pts = MULTI_CLIMB_PTS;
    const minX = pts[0].x;
    const maxX = pts[pts.length - 1].x;
    const minY = 500;
    const maxY = 640;

    const ribbonWidth = 0.8;
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    // Terrain color palette stops
    const cDeepMoss = new THREE.Color(0x4a5c3e);
    const cClay = new THREE.Color(0xb99a5c);
    const cStone = new THREE.Color(0xe8dcc8);
    const cClimb = new THREE.Color(0xe08a34); // Warm ember

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const normX = ((p.x - minX) / (maxX - minX) - 0.5) * 8.0;
      const normY = ((p.y - minY) / (maxY - minY)) * 2.2 - 0.5;

      const isClimbSegment = p.x >= 3.15 && p.x <= 6.71;
      const t = (p.y - minY) / (maxY - minY);
      const gradientCol = t < 0.5 ? cDeepMoss.clone().lerp(cClay, t * 2) : cClay.clone().lerp(cStone, (t - 0.5) * 2);
      const baseCol = isClimbSegment ? gradientCol.lerp(cClimb, 0.35) : gradientCol;

      // Left vertex
      positions.push(normX, normY, -ribbonWidth / 2);
      colors.push(baseCol.r, baseCol.g, baseCol.b);

      // Right vertex
      positions.push(normX, normY, ribbonWidth / 2);
      colors.push(baseCol.r, baseCol.g, baseCol.b);
    }

    const indices: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Ground plane with subtle topographic rings
    const groundGeo = new THREE.RingGeometry(1.5, 6.5, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x332c22,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.8;
    scene.add(ground);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xf2ede3, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xe8dcc8, 1.2);
    dirLight.position.set(4, 8, 6);
    scene.add(dirLight);

    // Animation variables
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle 40s ambient drift loop
      mesh.rotation.y = Math.sin(elapsed * (Math.PI * 2 / 40)) * 0.12;
      camera.position.x = Math.sin(elapsed * 0.15) * 0.4;
      camera.lookAt(0, 0.2, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setHovered(true);
    // After ~1.5 seconds of hover, illuminate computed climb segment in --color-climb
    hoverTimerRef.current = setTimeout(() => {
      setRevealed(true);
    }, 1500);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRevealed(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  return (
    <div
      ref={mountRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '440px',
        position: 'relative',
        cursor: 'crosshair',
      }}
    >
      {/* Live reveal overlay pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          padding: '6px 14px',
          borderRadius: '4px',
          background: 'rgba(28, 25, 20, 0.85)',
          border: '1px solid var(--color-border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: revealed ? 'var(--color-climb)' : 'var(--color-text-secondary)',
          transition: 'all 0.8s ease',
          pointerEvents: 'none',
        }}
      >
        {revealed ? '↗ Sustained Climb: 3.15–6.71 km (120m at 3.4%)' : 'Hover to detect sustained climb'}
      </div>
    </div>
  );
};

export default HeroTerrainRibbon;
