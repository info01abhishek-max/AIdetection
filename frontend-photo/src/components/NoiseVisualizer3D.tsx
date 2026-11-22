'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface NoiseVisualizer3DProps {
  result: any
}

export function NoiseVisualizer3D({ result }: NoiseVisualizer3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null>(null)
  const prnuRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null>(null)
  const timeRef = useRef(0)

  const particleCount = useMemo(() => 10000, [])

  useEffect(() => {
    if (!groupRef.current) return

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const velocities = new Float32Array(particleCount * 3)
    const originalPositions = new Float32Array(particleCount * 3)

    const noiseDetails = result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details || {}
    noiseDetails?.noise_level || 0.5
    noiseDetails?.prnu_correlation || 0.5
    noiseDetails?.snr_db || 30

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2 + Math.random() * 2

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      originalPositions[i * 3] = x
      originalPositions[i * 3 + 1] = y
      originalPositions[i * 3 + 2] = z

      velocities[i * 3] = (Math.random() - 0.5) * 0.5
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5

      const intensity = Math.random()
      const rColor = 0.1 + intensity * 0.3
      const gColor = 0.1 + (1 - intensity) * 0.3
      const bColor = 0.8 + intensity * 0.2

      colors[i * 3] = rColor
      colors[i * 3 + 1] = gColor
      colors[i * 3 + 2] = bColor

      sizes[i] = 0.01 + Math.random() * 0.02
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particles = new THREE.Points(geometry, material)
    particlesRef.current = particles
    groupRef.current.add(particles)

    const prnuGeometry = new THREE.PlaneGeometry(8, 8, 64, 64)
    const prnuMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      wireframe: true,
    })
    const prnuMesh = new THREE.Mesh(prnuGeometry, prnuMaterial)
    prnuMesh.rotation.x = -Math.PI / 2
    prnuMesh.position.y = -2.5
    prnuRef.current = prnuMesh
    groupRef.current.add(prnuMesh)

    return () => {
      if (particlesRef.current) {
        groupRef.current?.remove(particlesRef.current)
        particlesRef.current.geometry.dispose()
        ;(particlesRef.current.material as THREE.Material).dispose()
      }
      if (prnuRef.current) {
        groupRef.current?.remove(prnuRef.current)
        prnuRef.current.geometry.dispose()
        ;(prnuRef.current.material as THREE.Material).dispose()
      }
    }
  }, [result, particleCount])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      const originalPositions = particlesRef.current.geometry.attributes.originalPosition.array as Float32Array
      const velocities = particlesRef.current.geometry.attributes.velocity.array as Float32Array

      const noiseDetails = result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details || {}
      const noiseLevel = noiseDetails?.noise_level || 0.5

      for (let i = 0; i < particleCount; i++) {
        const ox = originalPositions[i * 3]
        const oy = originalPositions[i * 3 + 1]
        const oz = originalPositions[i * 3 + 2]

        const noiseX = Math.sin(timeRef.current * 0.5 + ox * 2) * noiseLevel * 0.1
        const noiseY = Math.cos(timeRef.current * 0.3 + oy * 2) * noiseLevel * 0.1
        const noiseZ = Math.sin(timeRef.current * 0.7 + oz * 2) * noiseLevel * 0.1

        positions[i * 3] = ox + noiseX
        positions[i * 3 + 1] = oy + noiseY
        positions[i * 3 + 2] = oz + noiseZ
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y += delta * 0.01
    }

    if (prnuRef.current) {
      const positions = prnuRef.current.geometry.attributes.position.array as Float32Array
      const prnuCorrelation = result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details?.prnu_correlation || 0.5

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const z = positions[i + 2]
        positions[i + 1] = Math.sin(timeRef.current + x * 0.5) * Math.cos(timeRef.current + z * 0.5) * prnuCorrelation * 0.3
      }
      prnuRef.current.geometry.attributes.position.needsUpdate = true
      prnuRef.current.rotation.z += delta * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -5, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <div className="glass px-4 py-2 rounded-xl text-xs">
          <p className="font-mono text-cyan-400 uppercase tracking-wider">NOISE PATTERNS & PRNU</p>
          <div className="flex justify-center gap-4 mt-1 text-slate-400 text-xs">
            <span>Noise Level: {Math.round((result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details?.noise_level || 0) * 100)}%</span>
            <span>PRNU Correlation: {Math.round((result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details?.prnu_correlation || 0) * 100)}%</span>
            <span>SNR: {result?.detectors?.find((d: any) => d.name === 'Noise Analysis')?.details?.snr_db?.toFixed(1) || 'N/A'} dB</span>
          </div>
        </div>
      </Html>
    </group>
  )
}