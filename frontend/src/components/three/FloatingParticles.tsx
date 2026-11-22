'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface FloatingParticlesProps {
  count?: number
  radius?: number
  color?: string
  speed?: number
}

export function FloatingParticles({
  count = 150,
  radius = 4,
  color = '#06b6d4',
  speed = 0.15
}: FloatingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const initialPositions = useRef<Float32Array>()
  const velocities = useRef<Float32Array>()
  const timeRef = useRef(0)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const alphas = new Float32Array(count)
    const offsets = new Float32Array(count * 3)

    const colorObj = new THREE.Color(color)
    const violetColor = new THREE.Color('#8b5cf6')

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.3 + Math.random() * 0.7)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      offsets[i * 3] = Math.random() * Math.PI * 2
      offsets[i * 3 + 1] = Math.random() * Math.PI * 2
      offsets[i * 3 + 2] = Math.random() * 0.5 + 0.5

      sizes[i] = Math.random() * 2 + 0.5

      const mixFactor = Math.random()
      const mixedColor = colorObj.clone().lerp(violetColor, mixFactor)
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b

      alphas[i] = Math.random() * 0.5 + 0.3
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
    geo.setAttribute('offset', new THREE.BufferAttribute(offsets, 3))

    initialPositions.current = positions.slice()
    velocities.current = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      velocities.current[i] = (Math.random() - 0.5) * 0.002
    }

    return geo
  }, [count, radius, color])

  const material = useMemo(() =>
    new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), [])

  useFrame((_, delta) => {
    if (!pointsRef.current || !initialPositions.current || !velocities.current) return

    timeRef.current += delta * speed
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    const offsets = pointsRef.current.geometry.attributes.offset.array as Float32Array
    const alphas = pointsRef.current.geometry.attributes.alpha.array as Float32Array

    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const ox = offsets[idx]
      const oy = offsets[idx + 1]
      const oz = offsets[idx + 2]

      positions[idx] = initialPositions.current[idx] + Math.sin(timeRef.current + ox) * 0.15 * oz
      positions[idx + 1] = initialPositions.current[idx + 1] + Math.cos(timeRef.current + oy) * 0.15 * oz
      positions[idx + 2] = initialPositions.current[idx + 2] + Math.sin(timeRef.current * 0.7 + oz) * 0.1 * oz

      alphas[i] = 0.3 + Math.sin(timeRef.current * 2 + ox) * 0.3 * oz
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.alpha.needsUpdate = true

    pointsRef.current.rotation.y += delta * speed * 0.1
    pointsRef.current.rotation.x += delta * speed * 0.05
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}