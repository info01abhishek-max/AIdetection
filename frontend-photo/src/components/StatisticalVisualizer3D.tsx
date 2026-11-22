'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface StatisticalVisualizer3DProps {
  result: any
}

export function StatisticalVisualizer3D({ result }: StatisticalVisualizer3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const heatmapRef = useRef<THREE.InstancedMesh | null>(null)
  const anomalyRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null>(null)
  const timeRef = useRef(0)

  const gridSize = useMemo(() => 20, [])
  const cellCount = gridSize * gridSize

  const statDetails = useMemo(() => {
    return result?.detectors?.find((d: any) => d.name === 'Statistical Anomaly Detection')?.details || {}
  }, [result])

  const anomalyScore = statDetails?.anomaly_score || 0
  const entropy = statDetails?.entropy || 7.5
  const chiSquare = statDetails?.chi_square || 0
  const benfordLaw = statDetails?.benford_law_compliance || 0.5

  useEffect(() => {
    if (!groupRef.current) return

    const cellGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.35)
    const cellMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.7,
    })

    const cells = new THREE.InstancedMesh(cellGeometry, cellMaterial, cellCount)
    cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    heatmapRef.current = cells
    groupRef.current.add(cells)

    const dummy = new THREE.Object3D()
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j
        const x = (i - gridSize / 2 + 0.5) * 0.4
        const z = (j - gridSize / 2 + 0.5) * 0.4

        const dist = Math.sqrt((i - gridSize / 2) ** 2 + (j - gridSize / 2) ** 2)
        const maxDist = gridSize / 2 * Math.sqrt(2)
        const normalizedDist = dist / maxDist

        const height = 0.1 + anomalyScore * 2 * (1 - normalizedDist * 0.5) + Math.random() * 0.5

        dummy.position.set(x, height / 2, z)
        dummy.scale.set(1, height, 1)
        dummy.updateMatrix()
        cells.setMatrixAt(index, dummy.matrix)
      }
    }
    cells.instanceMatrix.needsUpdate = true

    const anomalyCount = 2000
    const anomalyGeometry = new THREE.BufferGeometry()
    const anomalyPositions = new Float32Array(anomalyCount * 3)
    const anomalyColors = new Float32Array(anomalyCount * 3)
    const anomalySizes = new Float32Array(anomalyCount)
    const anomalyOriginals = new Float32Array(anomalyCount * 3)

    for (let i = 0; i < anomalyCount; i++) {
      const x = (Math.random() - 0.5) * 8
      const y = Math.random() * 4 + 0.5
      const z = (Math.random() - 0.5) * 8

      anomalyPositions[i * 3] = x
      anomalyPositions[i * 3 + 1] = y
      anomalyPositions[i * 3 + 2] = z

      anomalyOriginals[i * 3] = x
      anomalyOriginals[i * 3 + 1] = y
      anomalyOriginals[i * 3 + 2] = z

      const intensity = Math.random()
      anomalyColors[i * 3] = 1.0
      anomalyColors[i * 3 + 1] = 0.2 + intensity * 0.3
      anomalyColors[i * 3 + 2] = 0.1

      anomalySizes[i] = 0.02 + Math.random() * 0.03
    }

    anomalyGeometry.setAttribute('position', new THREE.BufferAttribute(anomalyPositions, 3))
    anomalyGeometry.setAttribute('color', new THREE.BufferAttribute(anomalyColors, 3))
    anomalyGeometry.setAttribute('size', new THREE.BufferAttribute(anomalySizes, 1))
    anomalyGeometry.setAttribute('originalPosition', new THREE.BufferAttribute(anomalyOriginals, 3))

    const anomalyMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const anomalies = new THREE.Points(anomalyGeometry, anomalyMaterial)
    anomalyRef.current = anomalies
    groupRef.current.add(anomalies)

    return () => {
      if (heatmapRef.current) {
        groupRef.current?.remove(heatmapRef.current)
        heatmapRef.current.geometry.dispose()
        ;(heatmapRef.current.material as THREE.Material).dispose()
      }
      if (anomalyRef.current) {
        groupRef.current?.remove(anomalyRef.current)
        anomalyRef.current.geometry.dispose()
        ;(anomalyRef.current.material as THREE.Material).dispose()
      }
    }
  }, [result, gridSize, cellCount, anomalyScore])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (heatmapRef.current) {
      const dummy = new THREE.Object3D()

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const index = i * gridSize + j
          heatmapRef.current.getMatrixAt(index, dummy.matrix)

          const dist = Math.sqrt((i - gridSize / 2) ** 2 + (j - gridSize / 2) ** 2)
          const maxDist = gridSize / 2 * Math.sqrt(2)
          const normalizedDist = dist / maxDist

          const baseHeight = 0.1 + anomalyScore * 2 * (1 - normalizedDist * 0.5)
          const waveHeight = Math.sin(timeRef.current * 2 + i * 0.5 + j * 0.5) * 0.3 * anomalyScore
          dummy.scale.y = baseHeight + waveHeight
          dummy.position.y = dummy.scale.y / 2

          dummy.updateMatrix()
          heatmapRef.current.setMatrixAt(index, dummy.matrix)
        }
      }
      heatmapRef.current.instanceMatrix.needsUpdate = true

      const color = new THREE.Color()
      const hue = 0.55 - anomalyScore * 0.55
      color.setHSL(hue, 1, 0.5)
      ;(heatmapRef.current.material as THREE.MeshBasicMaterial).color = color
    }

    if (anomalyRef.current) {
      const positions = anomalyRef.current.geometry.attributes.position.array as Float32Array
      const originals = anomalyRef.current.geometry.attributes.originalPosition.array as Float32Array

      for (let i = 0; i < positions.length; i += 3) {
        const ox = originals[i]
        const oy = originals[i + 1]
        const oz = originals[i + 2]

        positions[i] = ox + Math.sin(timeRef.current * 0.5 + ox) * 0.1 * anomalyScore
        positions[i + 1] = oy + Math.cos(timeRef.current * 0.3 + oy) * 0.1 * anomalyScore
        positions[i + 2] = oz + Math.sin(timeRef.current * 0.7 + oz) * 0.1 * anomalyScore
      }
      anomalyRef.current.geometry.attributes.position.needsUpdate = true
      anomalyRef.current.rotation.y += delta * 0.01
    }

    const group = groupRef.current
    if (group) {
      group.rotation.y += delta * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -5.5, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <div className="glass px-4 py-2 rounded-xl text-xs">
          <p className="font-mono text-cyan-400 uppercase tracking-wider">STATISTICAL ANOMALY DETECTION</p>
          <div className="flex justify-center gap-4 mt-1 text-slate-400 text-xs flex-wrap">
            <span>Anomaly Score: {Math.round(anomalyScore * 100)}%</span>
            <span>Entropy: {entropy.toFixed(2)}</span>
            <span>Chi²: {chiSquare.toFixed(1)}</span>
            <span>Benford: {Math.round(benfordLaw * 100)}%</span>
          </div>
        </div>
      </Html>
    </group>
  )
}