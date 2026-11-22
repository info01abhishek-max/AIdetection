'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GridBackgroundProps {
  size?: number
  divisions?: number
  color?: string
  opacity?: number
}

export function GridBackground({
  size = 20,
  divisions = 40,
  color = '#06b6d4',
  opacity = 0.05
}: GridBackgroundProps) {
  const gridRef = useRef<THREE.GridHelper>(null)
  const timeRef = useRef(0)
  const lineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null)

  useMemo(() => {
    const helper = new THREE.GridHelper(size, divisions, color, color)
    helper.material.opacity = opacity
    helper.material.transparent = true
    helper.material.depthWrite = false
    helper.position.y = -1.5

    lineMaterialRef.current = helper.material as THREE.LineBasicMaterial
    return helper
  }, [size, divisions, color, opacity])

  useFrame((_, delta) => {
    timeRef.current += delta * 0.3

    if (gridRef.current && lineMaterialRef.current) {
      const pulse = Math.sin(timeRef.current) * 0.5 + 0.5
      lineMaterialRef.current.opacity = opacity * (0.5 + pulse * 0.5)

      gridRef.current.position.y = -1.5 + Math.sin(timeRef.current * 0.5) * 0.1
    }
  })

  return <gridHelper ref={gridRef} args={[size, divisions, color, color]} position={[0, -1.5, 0]} />
}