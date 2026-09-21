import { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { PointDto, SegmentDto } from '../types';

interface Props {
  points: PointDto[];
  climbSegment: SegmentDto | null;
  recoverySegment: SegmentDto | null;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
}

const CLIMB_COLOR = new THREE.Color(0xf59e0b);
const RECOVERY_COLOR = new THREE.Color(0x06b6d4);
const BASE_COLOR = new THREE.Color(0x818cf8);
const HOVER_COLOR = new THREE.Color(0xffffff);

export default function TerrainView({ points, climbSegment, recoverySegment, hoverIndex, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Normalised data for the 3D mesh
  const terrainData = useMemo(() => {
    if (points.length < 2) return null;

    const maxDist = points[points.length - 1].distanceKm;
    const minEle = Math.min(...points.map(p => p.smoothedElevationM));
    const maxEle = Math.max(...points.map(p => p.smoothedElevationM));
    const eleRange = maxEle - minEle || 1;

    // Scale: x spans [-5, 5], y (elevation) spans [0, 3], z (depth) [-0.5, 0.5]
    const scaledPts = points.map(p => ({
      x: (p.distanceKm / maxDist) * 10 - 5,
      y: ((p.smoothedElevationM - minEle) / eleRange) * 3,
      z: 0,
      index: p.index,
      distKm: p.distanceKm,
      ele: p.smoothedElevationM,
    }));

    return { scaledPts, minEle, maxEle, eleRange, maxDist };
  }, [points]);

  // Determine segment ranges by point index
  const isInClimb = useCallback((idx: number) => {
    if (!climbSegment) return false;
    return idx >= climbSegment.startIndex && idx <= climbSegment.endIndex;
  }, [climbSegment]);

  const isInRecovery = useCallback((idx: number) => {
    if (!recoverySegment) return false;
    return idx >= recoverySegment.startIndex && idx <= recoverySegment.endIndex;
  }, [recoverySegment]);

  useEffect(() => {
    if (!containerRef.current || !terrainData) return;
    const container = containerRef.current;
    const { scaledPts, maxDist } = terrainData;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x111827);
    container.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x111827, 0.04);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);

    // ── Lights ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    scene.add(directional);

    // ── Terrain ribbon geometry ──
    const ribbonWidth = 0.8;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < scaledPts.length; i++) {
      const p = scaledPts[i];
      // Front vertex
      positions.push(p.x, p.y, ribbonWidth / 2);
      // Back vertex
      positions.push(p.x, p.y, -ribbonWidth / 2);

      // Color based on segment
      let color: THREE.Color;
      if (isInClimb(p.index)) {
        color = CLIMB_COLOR;
      } else if (isInRecovery(p.index)) {
        color = RECOVERY_COLOR;
      } else {
        color = BASE_COLOR;
      }
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);

      // Triangles
      if (i < scaledPts.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    // Side walls (floor to terrain) for visual depth
    const wallPositions: number[] = [];
    const wallColors: number[] = [];
    const wallIndices: number[] = [];

    for (let i = 0; i < scaledPts.length; i++) {
      const p = scaledPts[i];
      // Terrain point (front)
      wallPositions.push(p.x, p.y, ribbonWidth / 2);
      // Floor point (front)
      wallPositions.push(p.x, -0.1, ribbonWidth / 2);

      let color: THREE.Color;
      if (isInClimb(p.index)) {
        color = CLIMB_COLOR.clone().multiplyScalar(0.4);
      } else if (isInRecovery(p.index)) {
        color = RECOVERY_COLOR.clone().multiplyScalar(0.4);
      } else {
        color = BASE_COLOR.clone().multiplyScalar(0.3);
      }
      wallColors.push(color.r, color.g, color.b);
      wallColors.push(color.r * 0.3, color.g * 0.3, color.b * 0.3);

      if (i < scaledPts.length - 1) {
        const base = i * 2;
        wallIndices.push(base, base + 1, base + 2);
        wallIndices.push(base + 1, base + 3, base + 2);
      }
    }

    // Top ribbon mesh
    const topGeom = new THREE.BufferGeometry();
    topGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    topGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    topGeom.setIndex(indices);
    topGeom.computeVertexNormals();
    const topMat = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 40 });
    const mesh = new THREE.Mesh(topGeom, topMat);
    scene.add(mesh);

    // Wall mesh
    const wallGeom = new THREE.BufferGeometry();
    wallGeom.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
    wallGeom.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
    wallGeom.setIndex(wallIndices);
    wallGeom.computeVertexNormals();
    const wallMat = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 10 });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    scene.add(wallMesh);

    // ── Grid floor ──
    const gridHelper = new THREE.GridHelper(12, 24, 0x1e293b, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // ── Hover sphere (cursor beacon) ──
    const hoverGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const hoverMat = new THREE.MeshStandardMaterial({
      color: HOVER_COLOR,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const hoverSphere = new THREE.Mesh(hoverGeo, hoverMat);
    hoverSphere.visible = false;
    scene.add(hoverSphere);

    // ── Interactive hit targets for smooth cursor tracking in 3D ──
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // Vertical plane
    const vPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), hitMat);
    vPlane.position.set(0, 1.5, 0);
    scene.add(vPlane);

    // Horizontal plane
    const hPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), hitMat);
    hPlane.rotation.x = -Math.PI / 2;
    hPlane.position.set(0, 1.0, 0);
    scene.add(hPlane);

    // ── Orbit controls (manual) ──
    let cameraAngle = Math.PI / 4;
    let cameraElevation = 0.6;
    let cameraRadius = 10;
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    const updateCamera = () => {
      camera.position.x = cameraRadius * Math.cos(cameraAngle) * Math.cos(cameraElevation);
      camera.position.y = cameraRadius * Math.sin(cameraElevation) + 2;
      camera.position.z = cameraRadius * Math.sin(cameraAngle) * Math.cos(cameraElevation);
      camera.lookAt(0, 1, 0);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent | PointerEvent) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent | PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        cameraAngle += dx * 0.005;
        cameraElevation = Math.max(0.1, Math.min(1.4, cameraElevation + dy * 0.005));
        lastMouse = { x: e.clientX, y: e.clientY };
        updateCamera();
      } else {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
          onHover(null);
          return;
        }

        const mouse = new THREE.Vector2(
          (mouseX / rect.width) * 2 - 1,
          -(mouseY / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([mesh, wallMesh, vPlane, hPlane]);
        if (intersects.length > 0) {
          const x = THREE.MathUtils.clamp(intersects[0].point.x, -5, 5);
          let closest = 0;
          let minDist = Infinity;
          for (let i = 0; i < scaledPts.length; i++) {
            const d = Math.abs(scaledPts[i].x - x);
            if (d < minDist) { minDist = d; closest = i; }
          }
          onHover(scaledPts[closest].index);
        } else {
          // Direct fallback mapping: cursor X across 3D canvas maps to route distance
          const progress = THREE.MathUtils.clamp(mouseX / rect.width, 0, 1);
          const targetDist = progress * maxDist;
          let closest = 0;
          let minDist = Infinity;
          for (let i = 0; i < scaledPts.length; i++) {
            const d = Math.abs(scaledPts[i].distKm - targetDist);
            if (d < minDist) { minDist = d; closest = i; }
          }
          onHover(scaledPts[closest].index);
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRadius = Math.max(4, Math.min(20, cameraRadius + e.deltaY * 0.01));
      updateCamera();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('pointermove', onMouseMove);
    container.addEventListener('mouseleave', () => { isDragging = false; onHover(null); });
    container.addEventListener('pointerleave', () => { isDragging = false; onHover(null); });
    renderer.domElement.addEventListener('pointerdown', onMouseDown);
    renderer.domElement.addEventListener('pointerup', onMouseUp);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // ── Animation loop ──
    const animate = () => {
      const animId = requestAnimationFrame(animate);
      sceneRef.current = {
        ...sceneRef.current!,
        animId,
        cameraAngle,
        cameraElevation,
        cameraRadius,
      };
      renderer.render(scene, camera);
    };

    sceneRef.current = {
      renderer, scene, camera, mesh, hoverSphere,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      isDragging, lastMouse,
      cameraAngle, cameraElevation, cameraRadius,
      animId: 0,
    };

    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('pointermove', onMouseMove);
      container.removeEventListener('mouseleave', () => { isDragging = false; onHover(null); });
      container.removeEventListener('pointerleave', () => { isDragging = false; onHover(null); });
      renderer.domElement.removeEventListener('pointerdown', onMouseDown);
      renderer.domElement.removeEventListener('pointerup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [terrainData, isInClimb, isInRecovery, onHover]);

  // Update hover sphere position when hoverIndex changes
  useEffect(() => {
    if (!sceneRef.current || !terrainData) return;
    const { hoverSphere } = sceneRef.current;
    const { scaledPts } = terrainData;

    if (hoverIndex == null) {
      hoverSphere.visible = false;
      return;
    }

    const pt = scaledPts.find(p => p.index === hoverIndex);
    if (pt) {
      hoverSphere.position.set(pt.x, pt.y + 0.15, 0);
      hoverSphere.visible = true;
    } else {
      hoverSphere.visible = false;
    }
  }, [hoverIndex, terrainData]);

  return (
    <div className="terrain-container" ref={containerRef} style={{ cursor: 'grab' }} />
  );
}
