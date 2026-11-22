'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HolographicTextLayersProps {
  analysisState: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  aiProbability?: number
}

export function HolographicTextLayers({ analysisState, aiProbability = 0 }: HolographicTextLayersProps) {
  const layersRef = useRef<THREE.Mesh[]>([])
  const ringRefs = useRef<THREE.Mesh[]>([])
  const particleRefs = useRef<THREE.Points[]>([])
  const timeRef = useRef(0)
  const rotationRef = useRef(0)

  const layerMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const highlightedLayerMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const ringMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(300 * 3)
    const sizes = new Float32Array(300)
    const colors = new Float32Array(300 * 3)
    const velocities = new Float32Array(300 * 3)

    for (let i = 0; i < 300; i++) {
      const layer = Math.floor(i / 50)
      const angle = (i % 50) / 50 * Math.PI * 2
      const radius = 1.5 + layer * 0.3
      const height = (layer - 2) * 0.4

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius
      sizes[i] = 1.5 + Math.random() * 2

      const isAI = Math.random() < aiProbability
      const c = new THREE.Color(isAI ? '#ef4444' : '#06b6d4')
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    return geometry
  }, [aiProbability])

  const particleMaterial = useMemo(() =>
    new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (analysisState === 'processing' || analysisState === 'analyzing') {
      rotationRef.current += delta * 0.2

      layersRef.current.forEach((layer, i) => {
        if (!layer) return
        layer.rotation.y = rotationRef.current + i * 0.3
        layer.position.y = Math.sin(timeRef.current * 1.5 + i) * 0.05

        const material = layer.material as THREE.MeshBasicMaterial
        const baseOpacity = layer.userData.highlighted ? 0.2 : 0.1
        material.opacity = baseOpacity + Math.sin(timeRef.current * 3 + i) * 0.05
      })

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return
        ring.rotation.y = -rotationRef.current * 0.5 + i * 0.5
        ring.rotation.x = Math.sin(timeRef.current + i) * 0.1

        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = 0.1 + Math.sin(timeRef.current * 2 + i) * 0.05
      })

      const particlePositions = particleRefs.current[0]?.geometry?.attributes?.position?.array as Float32Array
      const particleVelocities = particleRefs.current[0]?.geometry?.attributes?.velocity?.array as Float32Array

      if (particlePositions && particleVelocities) {
        for (let i = 0; i < 300; i++) {
          particlePositions[i * 3] += particleVelocities[i * 3] * delta * 60
          particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1] * delta * 60
          particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * delta * 60

          const radius = Math.sqrt(
            particlePositions[i * 3] ** 2 + particlePositions[i * 3 + 2] ** 2
          )

          if (radius > 3) {
            const angle = Math.random() * Math.PI * 2
            const layer = Math.floor(i / 50)
            const newRadius = 1.5 + layer * 0.3
            particlePositions[i * 3] = Math.cos(angle) * newRadius
            particlePositions[i * 3 + 2] = Math.sin(angle) * newRadius
            particlePositions[i * 3 + 1] = (layer - 2) * 0.4
          }
        }
        particleRefs.current[0].geometry.attributes.position.needsUpdate = true
      }
    } else if (analysisState === 'complete') {
      rotationRef.current += delta * 0.03

      layersRef.current.forEach((layer, i) => {
        if (!layer) return
        layer.rotation.y = rotationRef.current + i * 0.3
        layer.position.y = Math.sin(timeRef.current * 0.5 + i) * 0.02

        const material = layer.material as THREE.MeshBasicMaterial
        const targetOpacity = layer.userData.highlighted ? 0.15 : 0.05
        material.opacity += (targetOpacity - material.opacity) * delta * 2
      })

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return
        ring.rotation.y = -rotationRef.current * 0.3 + i * 0.5
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity += (0.08 - material.opacity) * delta * 2
      })
    } else {
      rotationRef.current *= 0.98

      layersRef.current.forEach((layer, i) => {
        if (!layer) return
        layer.rotation.y = rotationRef.current + i * 0.3
        layer.position.y *= 0.99

        const material = layer.material as THREE.MeshBasicMaterial
        material.opacity += (0.05 - material.opacity) * delta * 2
      })

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return
        ring.rotation.y = -rotationRef.current * 0.3 + i * 0.5
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity += (0.05 - material.opacity) * delta * 2
      })
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {Array.from({ length: 5 }, (_, i) => {
        const isHighlighted = i === 1 || i === 3
        return (
          <mesh
            key={`layer-${i}`}
            ref={(el) => { layersRef.current[i] = el! }}
            geometry={new THREE.PlaneGeometry(3, 0.02)}
            material={isHighlighted ? highlightedLayerMaterial : layerMaterial}
            position={[0, (i - 2) * 0.4, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            userData={{ highlighted: isHighlighted }}
          >
            <mesh
              geometry={new THREE.PlaneGeometry(2.8, 0.01)}
              material={new THREE.MeshBasicMaterial({
                color: isHighlighted ? '#ef4444' : '#06b6d4',
                transparent: true,
                opacity: isHighlighted ? 0.3 : 0.15,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              })}
              position={[0, 0.005, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          </mesh>
        )
      })}

      {Array.from({ length: 3 }, (_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => { ringRefs.current[i] = el! }}
          geometry={new THREE.RingGeometry(1.5 + i * 0.3, 1.7 + i * 0.3, 64)}
          material={ringMaterial}
          position={[0, (i - 1) * 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}

      <points
        ref={(el) => { particleRefs.current[0] = el! }}
        geometry={particleGeometry}
        material={particleMaterial}
      />
    </group>
  )
}