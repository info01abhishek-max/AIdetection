'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface VideoAnalyzer3DProps {
  analysisProgress: number;
  detectorResults: Record<string, number>;
}

export function VideoAnalyzer3D({
  analysisProgress,
  detectorResults,
}: VideoAnalyzer3DProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh[]>([]);
  const scanLineRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const detectorBarsRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const detectorNames = Object.keys(detectorResults);
  const barCount = detectorNames.length || 5;

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x = Math.sin(timeRef.current * 0.3) * 0.1;
    }

    if (coreRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.05 + analysisProgress * 0.1;
      coreRef.current.scale.setScalar(pulse);

      const hue = (timeRef.current * 0.1 + analysisProgress * 0.5) % 1;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissive.set(color);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + analysisProgress * 0.5;
    }

    ringsRef.current.forEach((ring, index) => {
      const speed = 0.3 + index * 0.1;
      ring.rotation.x += delta * speed;
      ring.rotation.z += delta * speed * 0.5;
      ring.scale.setScalar(1 + Math.sin(timeRef.current * speed * 2 + index) * 0.1);

      const opacity = 0.3 + Math.sin(timeRef.current * speed * 3 + index) * 0.2;
      (ring.material as THREE.MeshBasicMaterial).opacity = opacity;
    });

    if (scanLineRef.current) {
      const scanSpeed = 2 + analysisProgress * 2;
      scanLineRef.current.rotation.z += delta * scanSpeed;
      (scanLineRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(timeRef.current * 10) * 0.3;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.02;
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(timeRef.current * 2 + i * 0.01) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (detectorBarsRef.current && detectorNames.length > 0) {
      detectorNames.forEach((name, index) => {
        const bar = detectorBarsRef.current?.children[index] as THREE.Mesh;
        if (bar) {
          const targetHeight = (detectorResults[name] || 0) / 100 * 3;
          bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, Math.max(targetHeight, 0.1), delta * 5);

          const hue = (detectorResults[name] || 0) / 100 * 0.4;
          const color = new THREE.Color().setHSL(0.4 - hue, 0.8, 0.5);
          (bar.material as THREE.MeshStandardMaterial).color.set(color);
          (bar.material as THREE.MeshStandardMaterial).emissive.set(color);
          (bar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
        }
      });
    }

    if (camera) {
      camera.position.x = Math.sin(timeRef.current * 0.1) * 0.5;
      camera.position.y = 3 + Math.sin(timeRef.current * 0.15) * 0.3;
      camera.lookAt(0, 0, 0);
    }
  });

  const ringColors = [
    new THREE.Color(0x06b6d4),
    new THREE.Color(0x8b5cf6),
    new THREE.Color(0x22d3ee),
    new THREE.Color(0xa78bfa),
    new THREE.Color(0x06b6d4),
  ];

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={detectorBarsRef} position={[-4, -1.5, 0]}>
        {Array.from({ length: barCount }, (_, i) => (
          <mesh key={i} position={[i * 1.5, 0, 0]}>
            <boxGeometry args={[0.8, 0.1, 0.8]} />
            <meshStandardMaterial
              color={0x06b6d4}
              metalness={0.3}
              roughness={0.4}
              emissive={0x06b6d4}
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={coreRef} position={[0, 0, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 8]} />
        <meshStandardMaterial
          color={0x020617}
          metalness={0.8}
          roughness={0.1}
          transparent
          opacity={0.9}
          emissive={0x06b6d4}
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[1.05, 8]} />
        <meshStandardMaterial
          color={0x06b6d4}
          metalness={0.9}
          roughness={0.05}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) ringsRef.current[i] = el; }}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]}
        >
          <torusGeometry args={[1.5 + i * 0.3, 0.015, 16, 100]} />
          <meshBasicMaterial
            color={ringColors[i % ringColors.length]}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh
        ref={scanLineRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.4, 1.6, 64, 1, 0, Math.PI * 2]} />
        <meshBasicMaterial
          color={0x06b6d4}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      <points ref={particlesRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            itemSize={3}
            array={new Float32Array(Array.from({ length: 600 }, (_, i) => (Math.random() - 0.5) * (i % 3 === 1 ? 6 : 8)))}
          />
          <bufferAttribute
            attach="attributes-color"
            count={200}
            itemSize={3}
            array={new Float32Array(Array.from({ length: 200 }, (_, i) => {
              const hue = (i / 200) * 0.5 + 0.5;
              const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
              return [color.r, color.g, color.b];
            }).flat())}
          />
          <bufferAttribute
            attach="attributes-size"
            count={200}
            itemSize={1}
            array={new Float32Array(Array.from({ length: 200 }, () => Math.random() * 3 + 1))}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      <pointLight position={[5, 5, 5]} color={0x06b6d4} intensity={1} distance={20} decay={2} />
      <pointLight position={[-5, 3, -5]} color={0x8b5cf6} intensity={0.8} distance={20} decay={2} />
      <ambientLight color={0x1e293b} intensity={0.5} />
    </group>
  );
}