'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'

interface ImageAnalyzer3DProps {
  result: any
}

export function ImageAnalyzer3D({ result }: ImageAnalyzer3DProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null>(null)
  const wireframeRef = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null>(null)
  const timeRef = useRef(0)

  const particleCount = useMemo(() => 5000, [])
  const gridSize = useMemo(() => 4, [])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const originalPositions = new Float32Array(particleCount * 3)

    const aiProbability = result?.ai_generated_probability ?? 0.5
    const confidence = result?.confidence ?? 0.5

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * gridSize * 2
      const y = (Math.random() - 0.5) * gridSize * 2
      const z = (Math.random() - 0.5) * gridSize * 2

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      originalPositions[i * 3] = x
      originalPositions[i * 3 + 1] = y
      originalPositions[i * 3 + 2] = z

      const distance = Math.sqrt(x * x + y * y + z * z)
      Math.min(distance / (gridSize * 1.5), 1)

      let r, g, b
      if (aiProbability > 0.7) {
        r = 0.9 + 0.1 * Math.random()
        g = 0.2 + 0.2 * Math.random()
        b = 0.6 + 0.3 * Math.random()
      } else if (aiProbability > 0.4) {
        r = 1.0
        g = 0.6 + 0.3 * Math.random()
        b = 0.1 + 0.2 * Math.random()
      } else {
        r = 0.1 + 0.2 * Math.random()
        g = 0.7 + 0.3 * Math.random()
        b = 0.3 + 0.3 * Math.random()
      }

      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = 0.02 + Math.random() * 0.03 * confidence
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3))

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particles = new THREE.Points(geometry, material)
    particlesRef.current = particles
    groupRef.current.add(particles)

    const wireGeometry = new THREE.BoxGeometry(gridSize * 2, gridSize * 2, gridSize * 2)
    const wireEdges = new THREE.EdgesGeometry(wireGeometry)
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
    })
    const wireframe = new THREE.LineSegments(wireEdges, wireMaterial)
    wireframeRef.current = wireframe
    groupRef.current.add(wireframe)

    const detectors = result?.detectors || []
    detectors.forEach((detector: any, index: number) => {
      const detectorGeometry = new THREE.SphereGeometry(0.15, 16, 16)
      let detectorColor = 0x22d3ee

      if (detector.category === 'LIKELY_AI_GENERATED') detectorColor = 0xef4444
      else if (detector.category === 'POSSIBLE_MANIPULATION') detectorColor = 0xf59e0b
      else if (detector.category === 'LIKELY_AUTHENTIC') detectorColor = 0x22c55e

      const detectorMaterial = new THREE.MeshBasicMaterial({
        color: detectorColor,
        transparent: true,
        opacity: 0.8,
      })

      const angle = (index / detectors.length) * Math.PI * 2
      const radius = gridSize * 1.3
      const detectorMesh = new THREE.Mesh(detectorGeometry, detectorMaterial)
      detectorMesh.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * gridSize,
        Math.sin(angle) * radius
      )
      detectorMesh.userData = { angle, radius, index, detector }
      group.add(detectorMesh)
    })

    return () => {
      const group = groupRef.current
      if (!group) return
      if (particlesRef.current) {
        group.remove(particlesRef.current)
        particlesRef.current.geometry.dispose()
        ;(particlesRef.current.material as THREE.Material).dispose()
      }
      if (wireframeRef.current) {
        group.remove(wireframeRef.current)
        wireframeRef.current.geometry.dispose()
        ;(wireframeRef.current.material as THREE.Material).dispose()
      }
    }
  }, [result, particleCount, gridSize])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      const originalPositions = particlesRef.current.geometry.attributes.originalPosition.array as Float32Array
      const aiProbability = result?.ai_generated_probability ?? 0.5

      for (let i = 0; i < particleCount; i++) {
        const ox = originalPositions[i * 3]
        const oy = originalPositions[i * 3 + 1]
        const oz = originalPositions[i * 3 + 2]

        const noiseScale = 0.5 + aiProbability * 1.5
        const noiseX = Math.sin(timeRef.current * 0.5 + ox * noiseScale) * 0.05 * aiProbability
        const noiseY = Math.cos(timeRef.current * 0.3 + oy * noiseScale) * 0.05 * aiProbability
        const noiseZ = Math.sin(timeRef.current * 0.7 + oz * noiseScale) * 0.05 * aiProbability

        positions[i * 3] = ox + noiseX
        positions[i * 3 + 1] = oy + noiseY
        positions[i * 3 + 2] = oz + noiseZ
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y += delta * 0.02
      particlesRef.current.rotation.x += delta * 0.01
    }

    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += delta * 0.01
      const opacity = 0.2 + 0.3 * Math.sin(timeRef.current * 2)
      ;(wireframeRef.current.material as THREE.LineBasicMaterial).opacity = opacity
    }

    const group = groupRef.current
    if (group) {
      group.children.forEach(child => {
        if (child.userData?.angle !== undefined) {
          child.userData.angle += delta * 0.3
          child.position.x = Math.cos(child.userData.angle) * child.userData.radius
          child.position.z = Math.sin(child.userData.angle) * child.userData.radius
          child.position.y = Math.sin(timeRef.current * 2 + child.userData.index) * 0.5
          child.rotation.y += delta
          child.scale.setScalar(1 + 0.2 * Math.sin(timeRef.current * 3 + child.userData.index))
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -gridSize - 1.5, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="glass px-4 py-2 rounded-xl text-xs"
        >
          <p className="font-mono text-cyan-400 uppercase tracking-wider">IMAGE STRUCTURE ANALYSIS</p>
          <p className="text-slate-400 mt-1">
            {result?.ai_generated_probability !== null
              ? `AI Probability: ${Math.round(result.ai_generated_probability * 100)}%`
              : 'Analyzing...'}
          </p>
        </motion.div>
      </Html>
    </group>
  )
}

import { Html } from '@react-three/drei'