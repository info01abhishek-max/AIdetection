'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Microphone3DProps {
  analysisState: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
  audioLevel?: number
}

export function Microphone3D({ analysisState, audioLevel = 0 }: Microphone3DProps) {
  const micRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const grilleRef = useRef<THREE.Mesh>(null)
  const standRef = useRef<THREE.Group>(null)
  const ringRefs = useRef<THREE.Mesh[]>([])
  const timeRef = useRef(0)
  const pulsePhaseRef = useRef(0)

  const bodyMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#1e293b',
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }), [])

  const grilleMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#0f172a',
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }), [])

  const standMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#334155',
      metalness: 0.7,
      roughness: 0.3,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    }), [])

  const ringMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const activeRingMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#22c55e',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (micRef.current) {
      // Subtle floating animation
      const floatY = Math.sin(timeRef.current * 0.7) * 0.05
      micRef.current.position.y = floatY

      // Rotation based on analysis state
      if (analysisState === 'scanning' || analysisState === 'analyzing') {
        micRef.current.rotation.y += delta * 0.2
      } else {
        micRef.current.rotation.y *= 0.95
      }
    }

    // Pulse rings during analysis
    if ((analysisState === 'scanning' || analysisState === 'analyzing') && audioLevel > 0) {
      pulsePhaseRef.current += delta * 3

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return
        const material = ring.material as THREE.MeshBasicMaterial
        const phase = pulsePhaseRef.current + i * 1.5
        const scale = 1 + Math.sin(phase) * 0.5
        ring.scale.setScalar(scale)
        material.opacity = 0.6 * (1 - Math.abs(Math.sin(phase))) * audioLevel
      })
    } else {
      // Fade out rings
      ringRefs.current.forEach((ring) => {
        if (!ring) return
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity *= 0.95
        ring.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 2)
      })
    }

    // Grille glow during analysis
    if (grilleRef.current) {
      const material = grilleRef.current.material as THREE.MeshPhysicalMaterial
      if (analysisState === 'scanning' || analysisState === 'analyzing') {
        material.emissive = new THREE.Color('#06b6d4')
        material.emissiveIntensity = 0.3 + Math.sin(timeRef.current * 4) * 0.2
      } else if (analysisState === 'complete') {
        material.emissive = new THREE.Color('#22c55e')
        material.emissiveIntensity = 0.2 + Math.sin(timeRef.current * 2) * 0.1
      } else {
        material.emissiveIntensity *= 0.9
      }
    }
  })

  return (
    <group
      ref={micRef}
      position={[0, -0.5, 0]}
    >
      {/* Microphone Stand */}
      <group
        ref={standRef}
        position={[0, -1.5, 0]}
      >
        {/* Base */}
        <mesh
          geometry={new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32)}
          material={standMaterial}
          position={[0, -0.05, 0]}
        />
        <mesh
          geometry={new THREE.TorusGeometry(0.4, 0.03, 16, 32)}
          material={standMaterial}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        {/* Vertical pole */}
        <mesh
          geometry={new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16)}
          material={standMaterial}
          position={[0, 0.6, 0]}
        />
        {/* Boom arm */}
        <mesh
          geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.5, 16)}
          material={standMaterial}
          position={[0.25, 1.2, 0]}
          rotation={[0, 0, -Math.PI / 2]}
        />
        {/* Shock mount */}
        <mesh
          geometry={new THREE.TorusGeometry(0.15, 0.025, 16, 32)}
          material={standMaterial}
          position={[0.5, 1.2, 0]}
          rotation={[0, 0, -Math.PI / 2]}
        />
        <mesh
          geometry={new THREE.TorusGeometry(0.15, 0.025, 16, 32)}
          material={standMaterial}
          position={[0.5, 1.2, 0]}
          rotation={[Math.PI / 2, 0, -Math.PI / 2]}
        />
      </group>

      {/* Microphone Body */}
      <group position={[0.5, 1.2, 0]}>
        {/* Main body */}
        <mesh
          ref={bodyRef}
          geometry={new THREE.CapsuleGeometry(0.12, 0.6, 16, 32)}
          material={bodyMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
        />

        {/* Grille top */}
        <mesh
          ref={grilleRef}
          geometry={new THREE.CylinderGeometry(0.13, 0.13, 0.15, 32, 8, true)}
          material={grilleMaterial}
          position={[0, 0.375, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/* Inner grille pattern */}
          <mesh
            geometry={new THREE.CylinderGeometry(0.11, 0.11, 0.16, 32, 8, true)}
            material={new THREE.MeshBasicMaterial({
              color: '#020617',
              transparent: true,
              opacity: 0.8,
              side: THREE.BackSide,
            })}
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </mesh>

        {/* Grille mesh pattern */}
        <group position={[0, 0.375, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              geometry={new THREE.BoxGeometry(0.008, 0.008, 0.18)}
              material={new THREE.MeshBasicMaterial({ color: '#1e293b' })}
              position={[
                Math.cos(i * Math.PI / 4) * 0.1,
                Math.sin(i * Math.PI / 4) * 0.1,
                0
              ]}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i + 8}
              geometry={new THREE.BoxGeometry(0.008, 0.008, 0.18)}
              material={new THREE.MeshBasicMaterial({ color: '#1e293b' })}
              position={[
                Math.cos(i * Math.PI / 4 + Math.PI / 8) * 0.07,
                Math.sin(i * Math.PI / 4 + Math.PI / 8) * 0.07,
                0
              ]}
            />
          ))}
        </group>

        {/* XLR connector */}
        <mesh
          geometry={new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16)}
          material={standMaterial}
          position={[0, -0.34, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <mesh
          geometry={new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16)}
          material={new THREE.MeshBasicMaterial({ color: '#020617' })}
          position={[0, -0.38, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />

        {/* Brand ring */}
        <mesh
          geometry={new THREE.TorusGeometry(0.125, 0.006, 16, 32)}
          material={new THREE.MeshPhysicalMaterial({
            color: '#06b6d4',
            metalness: 1,
            roughness: 0,
            emissive: '#06b6d4',
            emissiveIntensity: 0.5,
          })}
          position={[0, -0.15, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />

        {/* Pulse rings for visualization */}
        {Array.from({ length: 3 }, (_, i) => (
          <mesh
            key={`ring-${i}`}
            ref={(el) => { ringRefs.current[i] = el! }}
            geometry={new THREE.RingGeometry(0.25 + i * 0.15, 0.3 + i * 0.15, 64)}
            material={i === 0 ? activeRingMaterial : ringMaterial}
            position={[0, 0.2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        ))}
      </group>

      {/* Status indicator light */}
      <mesh
        geometry={new THREE.SphereGeometry(0.03, 16, 16)}
        material={new THREE.MeshBasicMaterial({
          color: analysisState === 'complete' ? '#22c55e' : analysisState === 'error' ? '#ef4444' : '#06b6d4',
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        })}
        position={[-0.3, 1.5, 0.3]}
      >
        <mesh
          geometry={new THREE.SphereGeometry(0.05, 16, 16)}
          material={new THREE.MeshBasicMaterial({
            color: analysisState === 'complete' ? '#22c55e' : analysisState === 'error' ? '#ef4444' : '#06b6d4',
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })}
        />
      </mesh>
    </group>
  )
}