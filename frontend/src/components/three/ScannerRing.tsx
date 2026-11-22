'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

interface ScannerRingProps {
  radius?: number
  color?: string
  speed?: number
  intensity?: number
}

export function ScannerRing({
  radius = 2,
  color = '#06b6d4',
  speed = 0.5,
  intensity = 1
}: ScannerRingProps) {
  const ringRef = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const pulseRef = useRef(0)
  const scanLineRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * speed * 0.3
      ringRef.current.rotation.x = Math.PI / 2

      pulseRef.current += delta * 2
      const pulse = Math.sin(pulseRef.current) * 0.3 + 0.7
      const material = ringRef.current.material as THREE.MeshBasicMaterial
      material.opacity = pulse * 0.6 * intensity
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * speed * 0.2
      ring2Ref.current.rotation.x = Math.PI / 2
    }

    if (scanLineRef.current) {
      scanLineRef.current.rotation.z -= delta * speed * 0.8
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.4 * intensity
    }
  })

  return (
    <group>
      <mesh ref={ringRef} position={[0, 0, 0]}>
        <torusGeometry args={[radius, 0.02, 16, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ring2Ref} position={[0, 0, 0]} scale={[1.5, 1.5, 1.5]}>
        <torusGeometry args={[radius, 0.01, 8, 32]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={scanLineRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, radius * 1.1, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.95, radius * 1.05, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}