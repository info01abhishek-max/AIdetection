'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { ScannerRing } from './ScannerRing'
import { FloatingParticles } from './FloatingParticles'
import { HolographicCard } from './HolographicCard'
import { GridBackground } from './GridBackground'

interface ImageAnalyzer3DProps {
  texture: THREE.Texture | null
  analysisState: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
  onCardClick?: () => void
}

export function ImageAnalyzer3D({
  texture,
  analysisState,
  onCardClick
}: ImageAnalyzer3DProps) {
  const mainMeshRef = useRef<THREE.Mesh>(null)
  const scanLineRef = useRef<THREE.Mesh>(null)
  const ringGroupRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)
  const particlesVisibleRef = useRef(true)

  const mainGeometry = useMemo(() =>
    new THREE.BoxGeometry(2.5, 2.5 * 9/16, 0.1, 32, 32), [])

  const mainMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      map: texture,
      transmission: 0.1,
      thickness: 0.1,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      ior: 1.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: texture ? 0.95 : 0.3,
    }), [texture])

  const wireframeMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }), [])

  const scanLineMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }), [])

  const scanLineGeometry = useMemo(() =>
    new THREE.PlaneGeometry(3, 0.08), [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (mainMeshRef.current) {
      const floatY = Math.sin(timeRef.current * 0.8) * 0.08
      mainMeshRef.current.position.y = floatY

      if (analysisState === 'scanning' || analysisState === 'analyzing') {
        mainMeshRef.current.rotation.y += delta * 0.15
      } else {
        mainMeshRef.current.rotation.y += (0 - mainMeshRef.current.rotation.y) * delta * 2
      }

      const targetRotationX = Math.sin(timeRef.current * 0.5) * 0.05
      mainMeshRef.current.rotation.x += (targetRotationX - mainMeshRef.current.rotation.x) * delta * 2
    }

    if (scanLineRef.current && (analysisState === 'scanning' || analysisState === 'analyzing')) {
      const scanProgress = (timeRef.current * 0.5) % 2 - 1
      scanLineRef.current.position.y = scanProgress * 1.5
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.8 * (1 - Math.abs(scanProgress))
    } else if (scanLineRef.current) {
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0
    }

    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z += delta * 0.1
      if (analysisState === 'complete') {
        ringGroupRef.current.scale.setScalar(1 + Math.sin(timeRef.current * 2) * 0.05)
      }
    }

    particlesVisibleRef.current = analysisState !== 'complete'
  })

  const cardPositions = useMemo(() => ([
    [-3.5, 1.5, -2],
    [3.5, 1.2, -2.5],
    [-3.2, -1, -3],
    [3.8, -0.5, -2.8],
  ] as const), [])

  const cardRotations = useMemo(() => ([
    [0.1, -0.3, 0],
    [0.1, 0.3, 0],
    [-0.1, -0.2, 0.05],
    [-0.1, 0.2, -0.05],
  ] as const), [])

  useEffect(() => {
    if (texture) {
      mainMaterial.map = texture
      mainMaterial.needsUpdate = true
      mainMaterial.opacity = 0.95
    } else {
      mainMaterial.opacity = 0.3
    }
  }, [texture, mainMaterial])

  if (!texture && analysisState === 'idle') {
    return (
      <group>
        <GridBackground />
        <FloatingParticles count={200} radius={5} speed={0.1} />
        <group ref={ringGroupRef} position={[0, 0, 0]}>
          <ScannerRing radius={1.5} color="#06b6d4" speed={0.3} intensity={0.5} />
          <ScannerRing radius={2} color="#8b5cf6" speed={-0.2} intensity={0.3} />
        </group>

        <mesh
          ref={mainMeshRef}
          geometry={mainGeometry}
          material={mainMaterial}
          position={[0, 0, 0]}
        >
          <mesh geometry={mainGeometry} material={wireframeMaterial} position={[0, 0, 0.01]} />
        </mesh>

        <mesh ref={scanLineRef} geometry={scanLineGeometry} material={scanLineMaterial} position={[0, 0, 0.1]} />
      </group>
    )
  }

  return (
    <group>
      <GridBackground size={30} divisions={60} opacity={0.03} />
      <FloatingParticles count={150} radius={6} speed={0.15} />

      <group ref={ringGroupRef} position={[0, 0, 0]}>
        <ScannerRing
          radius={1.8}
          color={analysisState === 'complete' ? '#22c55e' : '#06b6d4'}
          speed={analysisState === 'scanning' ? 0.8 : 0.3}
          intensity={analysisState === 'scanning' ? 1 : 0.5}
        />
        <ScannerRing
          radius={2.4}
          color="#8b5cf6"
          speed={-0.2}
          intensity={0.3}
        />
      </group>

      <mesh
        ref={mainMeshRef}
        geometry={mainGeometry}
        material={mainMaterial}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <mesh geometry={mainGeometry} material={wireframeMaterial} position={[0, 0, 0.01]} />
      </mesh>

      <mesh ref={scanLineRef} geometry={scanLineGeometry} material={scanLineMaterial} position={[0, 0, 0.15]} />

      {cardPositions.map((pos, i) => (
        <HolographicCard
          key={i}
          texture={texture}
          position={pos as [number, number, number]}
          rotation={cardRotations[i] as [number, number, number]}
          scale={0.6}
          aspect={16/9}
          active={analysisState === 'complete'}
          onClick={onCardClick}
        />
      ))}

      {(analysisState === 'scanning' || analysisState === 'analyzing') && (
        <ScanProgressRing />
      )}
    </group>
  )
}

function ScanProgressRing() {
  const ringRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5
      const material = ringRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.6 + Math.sin(timeRef.current * 4) * 0.2
    }
  })

  return (
    <mesh ref={ringRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.8, 3, 64]} />
      <meshBasicMaterial
        color="#06b6d4"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}