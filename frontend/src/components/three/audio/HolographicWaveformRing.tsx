'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HolographicWaveformRingProps {
  analysisState: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
  progress?: number
  color?: string
  radius?: number
}

export function HolographicWaveformRing({
  analysisState,
  progress = 0,
  color = '#06b6d4',
  radius = 2
}: HolographicWaveformRingProps) {
  const ringRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const particleRefs = useRef<THREE.Points[]>([])
  const timeRef = useRef(0)
  const scanAngleRef = useRef(0)

  const ringGeometry = useMemo(() =>
    new THREE.RingGeometry(radius - 0.1, radius + 0.1, 128), [radius])

  const ringMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [color])

  const innerRingGeometry = useMemo(() =>
    new THREE.RingGeometry(radius - 0.3, radius - 0.15, 64), [radius])

  const innerRingMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(128 * 3)
    const sizes = new Float32Array(128)
    const colors = new Float32Array(128 * 3)

    for (let i = 0; i < 128; i++) {
      const angle = (i / 128) * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = 0
      sizes[i] = 4

      const c = new THREE.Color(color)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [color, radius])

  const particleMaterial = useMemo(() =>
    new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (analysisState === 'scanning' || analysisState === 'analyzing') {
      if (ringRef.current) {
        ringRef.current.rotation.z += delta * 0.3
      }
      if (innerRingRef.current) {
        innerRingRef.current.rotation.z -= delta * 0.2
      }
      scanAngleRef.current += delta * 2
    } else if (analysisState === 'complete') {
      if (ringRef.current) {
        ringRef.current.rotation.z += delta * 0.05
        ringRef.current.scale.setScalar(1 + Math.sin(timeRef.current * 1.5) * 0.02)
      }
      if (innerRingRef.current) {
        innerRingRef.current.rotation.z -= delta * 0.03
      }
    } else {
      if (ringRef.current) {
        ringRef.current.rotation.z += delta * 0.02
      }
      if (innerRingRef.current) {
        innerRingRef.current.rotation.z -= delta * 0.01
      }
    }

    const particlePositions = particleRefs.current[0]?.geometry?.attributes?.position?.array as Float32Array
    if (particlePositions) {
      for (let i = 0; i < 128; i++) {
        const angle = (i / 128) * Math.PI * 2
        let r = radius
        let z = 0

        if (analysisState === 'scanning' || analysisState === 'analyzing') {
          const wave = Math.sin(timeRef.current * 5 + i * 0.2) * 0.15
          const pulse = Math.sin(timeRef.current * 3 + angle * 2) * 0.1
          r = radius + wave + pulse
          z = Math.sin(timeRef.current * 2 + angle) * 0.1
        } else if (analysisState === 'complete') {
          r = radius + Math.sin(timeRef.current * 2 + angle * 3) * 0.05
          z = Math.sin(timeRef.current + angle * 2) * 0.05
        } else {
          r = radius + Math.sin(timeRef.current + angle * 4) * 0.03
        }

        particlePositions[i * 3] = Math.cos(angle) * r
        particlePositions[i * 3 + 1] = Math.sin(angle) * r
        particlePositions[i * 3 + 2] = z
      }
      particleRefs.current[0].geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      <mesh
        geometry={new THREE.RingGeometry(radius + 0.3, radius + 0.5, 64)}
        material={new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <mesh
        ref={ringRef}
        geometry={ringGeometry}
        material={ringMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <mesh
        ref={innerRingRef}
        geometry={innerRingGeometry}
        material={innerRingMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <points
        ref={(el) => { particleRefs.current[0] = el! }}
        geometry={particleGeometry}
        material={particleMaterial}
      />

      {(analysisState === 'scanning' || analysisState === 'analyzing') && (
        <ScanLine radius={radius} color={color} angle={scanAngleRef.current} time={timeRef.current} />
      )}

      {analysisState === 'complete' && progress > 0 && (
        <ProgressArc radius={radius + 0.2} progress={progress} color="#22c55e" />
      )}
    </group>
  )
}

function ScanLine({ radius, color, angle, time }: {
  radius: number;
  color: string;
  angle: number;
  time: number
}) {
  const lineRef = useRef<THREE.Line>(null as any)
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  useFrame(() => {
    if (!lineRef.current) return

    const positions = []
    const segments = 64
    const scanWidth = 0.3

    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const dist = Math.abs(a - angle)
      const intensity = Math.max(0, 1 - dist / scanWidth)

      if (intensity > 0.1) {
        const wave = Math.sin(time * 20 + a * 8) * 0.15 * intensity
        const r = radius + wave
        positions.push(
          Math.cos(a) * r,
          Math.sin(a) * r,
          0
        )
      }
    }

    const posArray = new Float32Array(positions.length)
    positions.forEach((v, i) => posArray[i] = v)
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geometry.attributes.position.needsUpdate = true
  })

  return (
    <line
      // @ts-expect-error - React Three Fiber renders THREE.Line, not SVGLineElement
      ref={lineRef}
      geometry={geometry}
      material={new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 3,
      })}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}

function ProgressArc({ radius, progress, color }: {
  radius: number;
  progress: number;
  color: string
}) {
  const arcRef = useRef<THREE.Line>(null as any)
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  useFrame(() => {
    if (!arcRef.current) return

    const positions = []
    const segments = Math.max(16, Math.floor(progress * 64))

    for (let i = 0; i <= segments; i++) {
      const angle = (i / 64) * Math.PI * 2
      positions.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      )
    }

    const posArray = new Float32Array(positions.length)
    positions.forEach((v, i) => posArray[i] = v)
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geometry.attributes.position.needsUpdate = true
  })

  return (
    <line
      // @ts-expect-error - React Three Fiber renders THREE.Line, not SVGLineElement
      ref={arcRef}
      geometry={geometry}
      material={new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 4,
      })}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}