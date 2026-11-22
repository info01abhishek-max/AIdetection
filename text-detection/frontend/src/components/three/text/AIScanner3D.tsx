'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AIScanner3DProps {
  analysisState: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  intensity?: number
}

export function AIScanner3D({ analysisState, intensity = 1 }: AIScanner3DProps) {
  const scannerRef = useRef<THREE.Group>(null!)
  const lensRef = useRef<THREE.Mesh>(null!)
  const ringRefs = useRef<THREE.Mesh[]>([])
  const particleRefs = useRef<THREE.Points[]>([])
  const beamRef = useRef<THREE.Mesh>(null!)
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

  const lensMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#06b6d4',
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: '#06b6d4',
      emissiveIntensity: 0,
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

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(200 * 3)
    const sizes = new Float32Array(200)
    const colors = new Float32Array(200 * 3)

    for (let i = 0; i < 200; i++) {
      const radius = 0.3 + Math.random() * 0.8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      sizes[i] = 2 + Math.random() * 3

      const c = new THREE.Color(Math.random() < 0.5 ? '#06b6d4' : '#8b5cf6')
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])

  const particleMaterial = useMemo(() =>
    new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }), [])

  const beamGeometry = useMemo(() =>
    new THREE.CylinderGeometry(0.02, 0.15, 3, 16, 1, true), [])

  const beamMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (scannerRef.current) {
      const floatY = Math.sin(timeRef.current * 0.6) * 0.05
      scannerRef.current.position.y = 1.5 + floatY

      if (analysisState === 'processing' || analysisState === 'analyzing') {
        scannerRef.current.rotation.y += delta * 0.3
      } else {
        scannerRef.current.rotation.y *= 0.95
      }
    }

    if ((analysisState === 'processing' || analysisState === 'analyzing') && intensity > 0) {
      pulsePhaseRef.current += delta * 4 * intensity

      if (lensRef.current) {
        const material = lensRef.current.material as THREE.MeshPhysicalMaterial
        material.emissiveIntensity = 0.5 + Math.sin(pulsePhaseRef.current) * 0.3 * intensity
      }

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return
        const material = ring.material as THREE.MeshBasicMaterial
        const phase = pulsePhaseRef.current + i * 2
        const scale = 1 + Math.sin(phase) * 0.6 * intensity
        ring.scale.setScalar(scale)
        material.opacity = 0.5 * (1 - Math.abs(Math.sin(phase))) * intensity
      })

      if (beamRef.current) {
        const material = beamRef.current.material as THREE.MeshBasicMaterial
        material.opacity = 0.3 * intensity * (0.5 + Math.sin(pulsePhaseRef.current * 2) * 0.3)
        beamRef.current.rotation.z += delta * 0.5
        beamRef.current.scale.y = 0.5 + Math.sin(pulsePhaseRef.current * 3) * 0.3
      }

      const particlePositions = particleRefs.current[0]?.geometry?.attributes?.position?.array as Float32Array
      if (particlePositions) {
        for (let i = 0; i < 200; i++) {
          const radius = Math.sqrt(
            particlePositions[i * 3] ** 2 +
            particlePositions[i * 3 + 1] ** 2 +
            particlePositions[i * 3 + 2] ** 2
          )
          const theta = Math.atan2(particlePositions[i * 3 + 1], particlePositions[i * 3])
          const phi = Math.acos(particlePositions[i * 3 + 2] / radius)

          const newRadius = radius + Math.sin(timeRef.current * 2 + i * 0.1) * 0.05 * intensity
          particlePositions[i * 3] = newRadius * Math.sin(phi) * Math.cos(theta + delta * 0.2)
          particlePositions[i * 3 + 1] = newRadius * Math.sin(phi) * Math.sin(theta + delta * 0.2)
          particlePositions[i * 3 + 2] = newRadius * Math.cos(phi + delta * 0.1)
        }
        particleRefs.current[0].geometry.attributes.position.needsUpdate = true
      }
    } else {
      if (lensRef.current) {
        const material = lensRef.current.material as THREE.MeshPhysicalMaterial
        material.emissiveIntensity *= 0.95
      }

      ringRefs.current.forEach((ring) => {
        if (!ring) return
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity *= 0.95
        ring.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 2)
      })

      if (beamRef.current) {
        const material = beamRef.current.material as THREE.MeshBasicMaterial
        material.opacity *= 0.95
      }
    }
  })

  return (
    <group ref={scannerRef} position={[2, 1.5, 0]}>
      <group>
        <mesh
          geometry={new THREE.CylinderGeometry(0.25, 0.3, 0.4, 32)}
          material={bodyMaterial}
        />

        <mesh
          ref={lensRef}
          geometry={new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32)}
          material={lensMaterial}
          position={[0, 0.25, 0]}
        >
          <mesh
            geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.12, 32)}
            material={new THREE.MeshBasicMaterial({
              color: '#020617',
              transparent: true,
              opacity: 0.3,
              side: THREE.BackSide,
            })}
            position={[0, 0, 0]}
          />
        </mesh>

        <mesh
          geometry={new THREE.TorusGeometry(0.28, 0.02, 16, 32)}
          material={new THREE.MeshPhysicalMaterial({
            color: '#06b6d4',
            metalness: 1,
            roughness: 0,
            emissive: '#06b6d4',
            emissiveIntensity: 0.5,
          })}
          position={[0, 0.1, 0]}
        />

        <mesh
          geometry={new THREE.CylinderGeometry(0.15, 0.2, 0.3, 32)}
          material={bodyMaterial}
          position={[0, -0.35, 0]}
        />

        {Array.from({ length: 3 }, (_, i) => (
          <mesh
            key={`ring-${i}`}
            ref={(el) => { ringRefs.current[i] = el! }}
            geometry={new THREE.RingGeometry(0.4 + i * 0.2, 0.5 + i * 0.2, 64)}
            material={i === 0 ? activeRingMaterial : ringMaterial}
            position={[0, 0.3, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        ))}

        <mesh
          ref={beamRef}
          geometry={beamGeometry}
          material={beamMaterial}
          position={[0, -0.65, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />

        <points
          ref={(el) => { particleRefs.current[0] = el! }}
          geometry={particleGeometry}
          material={particleMaterial}
        />
      </group>
    </group>
  )
}