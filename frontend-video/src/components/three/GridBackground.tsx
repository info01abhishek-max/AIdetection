'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface GridBackgroundProps {
  size?: number;
  divisions?: number;
}

export function GridBackground({ size = 50, divisions = 50 }: GridBackgroundProps) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const timeRef = useRef(0);

  const gridGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const step = size / divisions;
    const halfSize = size / 2;

    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;

      positions.push(-halfSize, -2, pos, halfSize, -2, pos);
      positions.push(pos, -2, -halfSize, pos, -2, halfSize);

      const intensity = 0.05 + (i / divisions) * 0.1;
      colors.push(intensity, intensity * 1.5, intensity * 2, intensity, intensity * 1.5, intensity * 2);
      colors.push(intensity, intensity * 1.5, intensity * 2, intensity, intensity * 1.5, intensity * 2);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geom;
  }, [size, divisions]);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] = -2 + Math.sin(timeRef.current * 0.5 + positions[i] * 0.1 + positions[i + 2] * 0.1) * 0.02;
      }
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <lineSegments
        ref={lineRef}
        geometry={gridGeometry}
      >
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.3}
        />
      </lineSegments>

      <mesh
        position={[0, -2.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[size, size, divisions, divisions]} />
        <meshBasicMaterial
          color={0x020617}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, -2.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={0x06b6d4}
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}