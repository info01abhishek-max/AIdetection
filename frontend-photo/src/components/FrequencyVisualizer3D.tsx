'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface FrequencyVisualizer3DProps {
  result: any
}

export function FrequencyVisualizer3D({ result }: FrequencyVisualizer3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const barsRef = useRef<THREE.InstancedMesh | null>(null)
  const timeRef = useRef(0)

  const gridSize = useMemo(() => 32, [])
  const barCount = gridSize * gridSize

  useEffect(() => {
    if (!groupRef.current) return

    const geometry = new THREE.BoxGeometry(0.8, 0.1, 0.8)
    const material = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
    })

    const mesh = new THREE.InstancedMesh(geometry, material, barCount)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    barsRef.current = mesh
    groupRef.current.add(mesh)

    const dummy = new THREE.Object3D()

    const freqData = result?.detectors?.find((d: any) => d.name === 'Frequency Analysis')?.details || {}
    const dctCoeffs = freqData?.dct_coefficients || []
    const highFreqEnergy = freqData?.high_frequency_energy || 0.5

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j
        const x = (i - gridSize / 2) * 1.2
        const z = (j - gridSize / 2) * 1.2

        const dist = Math.sqrt((i - gridSize / 2) ** 2 + (j - gridSize / 2) ** 2)
        const maxDist = gridSize / 2 * Math.sqrt(2)
        const normalizedDist = dist / maxDist

        let height = 0.1
        if (dctCoeffs.length > 0) {
          const coeffIndex = Math.floor(normalizedDist * (dctCoeffs.length - 1))
          height = 0.1 + (dctCoeffs[coeffIndex] || 0) * 3 * highFreqEnergy
        } else {
          height = 0.1 + Math.random() * 2 * (1 - normalizedDist) * highFreqEnergy
        }

        dummy.position.set(x, height / 2, z)
        dummy.scale.set(1, height, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      }
    }

    mesh.instanceMatrix.needsUpdate = true

    const wireGeometry = new THREE.PlaneGeometry(gridSize * 1.2, gridSize * 1.2, gridSize, gridSize)
    const wireEdges = new THREE.EdgesGeometry(wireGeometry)
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.2,
    })
    const wireframe = new THREE.LineSegments(wireEdges, wireMaterial)
    wireframe.rotation.x = -Math.PI / 2
    wireframe.position.y = -0.05
    groupRef.current.add(wireframe)

    return () => {
      groupRef.current?.remove(mesh)
      geometry.dispose()
      material.dispose()
      groupRef.current?.remove(wireframe)
      wireGeometry.dispose()
      wireMaterial.dispose()
    }
  }, [result, gridSize, barCount])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (barsRef.current) {
      const dummy = new THREE.Object3D()
      const freqData = result?.detectors?.find((d: any) => d.name === 'Frequency Analysis')?.details || {}
      const highFreqEnergy = freqData?.high_frequency_energy || 0.5

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const index = i * gridSize + j
          barsRef.current.getMatrixAt(index, dummy.matrix)
          dummy.scale.y = 1 + 0.3 * Math.sin(timeRef.current * 2 + i * 0.3 + j * 0.3) * highFreqEnergy
          dummy.updateMatrix()
          barsRef.current.setMatrixAt(index, dummy.matrix)
        }
      }
      barsRef.current.instanceMatrix.needsUpdate = true
    }

    const group = groupRef.current
    if (group) {
      group.rotation.y += delta * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -6, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <div className="glass px-4 py-2 rounded-xl text-xs">
          <p className="font-mono text-cyan-400 uppercase tracking-wider">FREQUENCY DOMAIN (DCT/FFT)</p>
          <p className="text-slate-400 mt-1">
            High Frequency Energy: {Math.round((result?.detectors?.find((d: any) => d.name === 'Frequency Analysis')?.details?.high_frequency_energy || 0) * 100)}%
          </p>
        </div>
      </Html>
    </group>
  )
}