'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface FrameTimeline3DProps {
  frameCount: number;
  currentFrame: number;
}

export function FrameTimeline3D({ frameCount, currentFrame }: FrameTimeline3DProps) {
  const timelineRef = useRef<THREE.Group>(null);
  const frameMarkersRef = useRef<THREE.Mesh[]>([]);
  const lineRef = useRef<THREE.Line>(null);
  const timeRef = useRef(0);

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const x = (i / Math.max(frameCount - 1, 1)) * 8 - 4;
      positions[i * 3] = x;
      positions[i * 3 + 1] = -2;
      positions[i * 3 + 2] = 0;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [frameCount]);

  const lineMaterial = useMemo(() =>
    new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.3,
      linewidth: 2,
      dashSize: 0.2,
      gapSize: 0.1,
    }), []);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.position.set(0, -2.5, -3);
    }
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;

    frameMarkersRef.current.forEach((marker, index) => {
      const isCurrent = index === currentFrame;
      const targetScale = isCurrent ? 1.5 : 1;
      marker.scale.y = THREE.MathUtils.lerp(marker.scale.y, targetScale, delta * 8);
      marker.scale.x = THREE.MathUtils.lerp(marker.scale.x, targetScale, delta * 8);
      marker.scale.z = THREE.MathUtils.lerp(marker.scale.z, targetScale, delta * 8);

      const pulse = isCurrent ? 1 + Math.sin(timeRef.current * 5) * 0.2 : 1;
      marker.scale.multiplyScalar(pulse);
    });

    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array;
      for (let i = 0; i < frameCount; i++) {
        const wave = Math.sin(timeRef.current * 2 + i * 0.5) * 0.05;
        positions[i * 3 + 1] = -2 + wave;
      }
      lineRef.current.geometry.attributes.position.needsUpdate = true;
      lineRef.current.computeLineDistances();
    }
  });

  const frameColors = [
    new THREE.Color(0xef4444),
    new THREE.Color(0x22c55e),
    new THREE.Color(0xeab308),
    new THREE.Color(0x64748b),
  ];

  return (
    <group ref={timelineRef}>
      <primitive
        ref={lineRef as any}
        object={new THREE.Line(lineGeometry, lineMaterial)}
      />

      {Array.from({ length: frameCount }, (_, i) => {
        const x = (i / Math.max(frameCount - 1, 1)) * 8 - 4;
        const isCurrent = i === currentFrame;
        const colorIndex = isCurrent ? 1 : i % 4;

        return (
          <mesh
            key={i}
            ref={(el) => { if (el) frameMarkersRef.current[i] = el; }}
            position={[x, -2, 0]}
            onClick={() => console.log('Frame clicked:', i)}
            onPointerOver={() => { if (frameMarkersRef.current[i]) (frameMarkersRef.current[i].material as THREE.MeshStandardMaterial).opacity = 1; }}
            onPointerOut={() => { if (frameMarkersRef.current[i]) (frameMarkersRef.current[i].material as THREE.MeshStandardMaterial).opacity = 0.7; }}
          >
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial
              color={isCurrent ? 0x06b6d4 : frameColors[colorIndex]}
              metalness={0.5}
              roughness={0.3}
              emissive={isCurrent ? 0x06b6d4 : frameColors[colorIndex]}
              emissiveIntensity={isCurrent ? 0.5 : 0.2}
              transparent
              opacity={isCurrent ? 1 : 0.7}
            />
          </mesh>
        );
      })}

      <Html
        position={[0, -3.5, 0]}
        transform
        sprite
        style={{
          pointerEvents: 'none',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}
      >
        <div>Frame Timeline • {frameCount} frames analyzed</div>
        <div className="text-cyan-400">Current: Frame {currentFrame}</div>
      </Html>

      <pointLight position={[0, 2, 2]} color={0x06b6d4} intensity={0.5} distance={10} decay={2} />
    </group>
  );
}