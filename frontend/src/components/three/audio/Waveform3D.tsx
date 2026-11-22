'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Waveform3DProps {
  audioData?: Float32Array
  analysisState: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
  color?: string
}

export function Waveform3D({ audioData, analysisState, color = '#06b6d4' }: Waveform3DProps) {
  const meshRef = useRef<THREE.Mesh>(null as any)
  const lineRef = useRef<THREE.Line>(null as any)
  const particleRefs = useRef<THREE.Points[]>([])
  const timeRef = useRef(0)
  const dataRef = useRef<Float32Array | null>(null)

  // Use provided audio data or generate placeholder
  useMemo(() => {
    if (audioData && audioData.length > 0) {
      dataRef.current = audioData
      return
    }
    // Generate placeholder waveform for idle state
    const placeholder = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      placeholder[i] = Math.sin(i * 0.1) * 0.3 + Math.sin(i * 0.05) * 0.2
    }
    dataRef.current = placeholder
  }, [audioData])

  const waveformGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(256 * 3)
    const colors = new Float32Array(256 * 3)

    for (let i = 0; i < 256; i++) {
      const x = (i - 128) * 0.04
      positions[i * 3] = x
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0

      // Gradient color
      const ratio = i / 255
      const c = new THREE.Color(color)
      const c2 = new THREE.Color('#8b5cf6')
      c.lerp(c2, ratio)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [color])

  const lineMaterial = useMemo(() =>
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(256 * 3)
    const sizes = new Float32Array(256)
    const colors = new Float32Array(256 * 3)

    for (let i = 0; i < 256; i++) {
      const x = (i - 128) * 0.04
      positions[i * 3] = x
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      sizes[i] = 3

      const ratio = i / 255
      const c = new THREE.Color(color)
      const c2 = new THREE.Color('#8b5cf6')
      c.lerp(c2, ratio)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [color])

  const particleMaterial = useMemo(() =>
    new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }), [color])

  useFrame((_, delta) => {
    timeRef.current += delta
    const data = dataRef.current
    if (!data || !meshRef.current) return

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    const linePositions = lineRef.current?.geometry?.attributes?.position?.array as Float32Array
    const particlePositions = particleRefs.current[0]?.geometry?.attributes?.position?.array as Float32Array

    const isAnalyzing = analysisState === 'scanning' || analysisState === 'analyzing'
    const isComplete = analysisState === 'complete'

    for (let i = 0; i < 256; i++) {
      const x = (i - 128) * 0.04
      let y = 0
      let z = 0

      if (data.length > 0) {
        const dataIndex = Math.floor(i / 256 * data.length)
        const amplitude = data[dataIndex] || 0

        if (isAnalyzing) {
          // Animated waveform during analysis
          const wave = Math.sin(timeRef.current * 3 + i * 0.1) * 0.5
          const noise = (Math.random() - 0.5) * 0.1
          y = amplitude * 2 + wave + noise
          z = Math.sin(timeRef.current * 2 + i * 0.05) * 0.3
        } else if (isComplete) {
          // Static but animated result
          y = amplitude * 2
          z = Math.sin(timeRef.current + i * 0.1) * 0.1
        } else {
          // Idle state - gentle wave
          y = Math.sin(timeRef.current * 0.8 + i * 0.15) * 0.2
          z = Math.cos(timeRef.current * 0.6 + i * 0.1) * 0.1
        }
      } else {
        y = Math.sin(timeRef.current * 0.8 + i * 0.15) * 0.2
        z = Math.cos(timeRef.current * 0.6 + i * 0.1) * 0.1
      }

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      if (linePositions) {
        linePositions[i * 3] = x
        linePositions[i * 3 + 1] = y
        linePositions[i * 3 + 2] = z
      }

      if (particlePositions) {
        particlePositions[i * 3] = x
        particlePositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.05
        particlePositions[i * 3 + 2] = z
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true
    if (lineRef.current?.geometry?.attributes?.position) {
      lineRef.current.geometry.attributes.position.needsUpdate = true
    }
    particleRefs.current.forEach(p => {
      if (p.geometry.attributes.position) {
        p.geometry.attributes.position.needsUpdate = true
      }
    })

    // Rotate entire waveform slowly
    if (meshRef.current) {
      if (isAnalyzing) {
        meshRef.current.rotation.y += delta * 0.1
      } else {
        meshRef.current.rotation.y *= 0.98
      }
    }
  })

  // Main waveform mesh (ribbon)
  const ribbonGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const indices = []
    const colors = []

    const width = 0.08
    const segments = 256

    for (let i = 0; i < segments; i++) {
      const x = (i - segments / 2) * 0.04
      // Top vertex
      positions.push(x, 0, width / 2)
      // Bottom vertex
      positions.push(x, 0, -width / 2)

      const ratio = i / (segments - 1)
      const c = new THREE.Color(color)
      const c2 = new THREE.Color('#8b5cf6')
      c.lerp(c2, ratio)
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
    }

    for (let i = 0; i < segments - 1; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1
      indices.push(a, b, c, c, b, d)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [color])

  const ribbonMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }), [])

  return (
    <group position={[0, 0, 0]}>
      {/* Glow background */}
      <mesh
        geometry={new THREE.PlaneGeometry(12, 3)}
        material={new THREE.MeshBasicMaterial({
          color: '#06b6d4',
          transparent: true,
          opacity: 0.03,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })}
        position={[0, 0, -0.5]}
      />

      {/* Waveform ribbon */}
      <mesh
        ref={meshRef}
        geometry={ribbonGeometry}
        material={ribbonMaterial}
      />

      {/* Center line */}
      <line
        // @ts-expect-error - React Three Fiber renders THREE.Line, not SVGLineElement
        ref={lineRef}
        geometry={waveformGeometry}
        material={lineMaterial}
      />

      {/* Particles on peaks */}
      <points
        ref={(el) => { particleRefs.current[0] = el! }}
        geometry={particleGeometry}
        material={particleMaterial}
      />

      {/* Frequency bars at bottom */}
      <FrequencyBars analysisState={analysisState} color={color} />
    </group>
  )
}

function FrequencyBars({ analysisState, color }: { analysisState: string; color: string }) {
  const barsRef = useRef<THREE.Mesh[]>([])
  const timeRef = useRef(0)

  const barGeometry = useMemo(() => new THREE.BoxGeometry(0.03, 1, 0.03), [])
  const barMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [color])

  useFrame((_, delta) => {
    timeRef.current += delta

    barsRef.current.forEach((bar, i) => {
      if (!bar) return
      let height = 0

      if (analysisState === 'scanning' || analysisState === 'analyzing') {
        height = 0.5 + Math.sin(timeRef.current * 4 + i * 0.5) * 0.4 + Math.random() * 0.3
      } else if (analysisState === 'complete') {
        height = 0.3 + Math.sin(timeRef.current * 2 + i * 0.3) * 0.2
      } else {
        height = 0.1 + Math.sin(timeRef.current * 0.5 + i * 0.2) * 0.05
      }

      bar.scale.y = Math.max(0.1, height)
      bar.position.y = height / 2
    })
  })

  return (
    <group position={[0, -1.5, 0]}>
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { barsRef.current[i] = el! }}
          geometry={barGeometry}
          material={barMaterial}
          position={[(i - 15.5) * 0.05, 0, 0]}
        />
      ))}
    </group>
  )
}