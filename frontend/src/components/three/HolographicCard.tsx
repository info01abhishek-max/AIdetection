'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

interface HolographicCardProps {
  texture: THREE.Texture | null
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  aspect?: number
  active?: boolean
  onClick?: () => void
}

export function HolographicCard({
  texture,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  aspect = 16/9,
  active = false,
  onClick
}: HolographicCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const hoverRef = useRef(false)

  const geometry = useMemo(() =>
    new THREE.PlaneGeometry(1.6 * aspect * scale, 1.6 * scale, 1, 1),
  [aspect, scale])

  const material = useMemo(() =>
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: true,
    }), [texture])

  const glowMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (meshRef.current) {
      const targetY = active ? 0 : Math.sin(timeRef.current * 0.7) * 0.05
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * delta * 3

      if (hoverRef.current || active) {
        meshRef.current.rotation.y += delta * 0.15
      } else {
        meshRef.current.rotation.y += (0 - meshRef.current.rotation.y) * delta * 2
      }

      const pulse = Math.sin(timeRef.current * 2) * 0.1 + 0.9
      meshRef.current.scale.setScalar(scale * pulse)
    }

    if (glowRef.current && active) {
      const pulse = Math.sin(timeRef.current * 3) * 0.3 + 0.2
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = pulse
      glowRef.current.scale.setScalar(1.15 + Math.sin(timeRef.current * 2) * 0.05)
    }
  })

  const handlePointerOver = () => { hoverRef.current = true }
  const handlePointerOut = () => { hoverRef.current = false }
  const handleClick = () => { onClick?.() }

  return (
    <group position={position} rotation={rotation} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
      <mesh ref={glowRef} geometry={geometry} material={glowMaterial} position={[0, 0, -0.01]} scale={1.1} />
      <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />

      <mesh geometry={geometry} position={[0, 0, 0.001]}>
        <meshBasicMaterial
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}