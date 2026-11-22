'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface FloatingParticlesProps {
  count?: number;
  spread?: number;
}

export function FloatingParticles({ count = 100, spread = 20 }: FloatingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const initialPositionsRef = useRef<Float32Array>();

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = spread * (0.3 + Math.random() * 0.7);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const hue = 0.5 + Math.random() * 0.3;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;

      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    initialPositionsRef.current = positions.slice();

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    return geom;
  }, [count, spread]);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (pointsRef.current && initialPositionsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      const velocities = pointsRef.current.geometry.attributes.velocity.array;
      const initialPositions = initialPositionsRef.current;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        positions[i3] += velocities[i3] * delta * 60;
        positions[i3 + 1] += velocities[i3 + 1] * delta * 60;
        positions[i3 + 2] += velocities[i3 + 2] * delta * 60;

        const dx = positions[i3] - initialPositions[i3];
        const dy = positions[i3 + 1] - initialPositions[i3 + 1];
        const dz = positions[i3 + 2] - initialPositions[i3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > spread * 1.5) {
          positions[i3] = initialPositions[i3];
          positions[i3 + 1] = initialPositions[i3 + 1];
          positions[i3 + 2] = initialPositions[i3 + 2];
        }

        positions[i3 + 1] += Math.sin(timeRef.current * 0.5 + i * 0.1) * 0.002;
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}