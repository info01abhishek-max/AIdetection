'use client'

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Document3DProps {
  analysisState: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  progress?: number
}

export function Document3D({ analysisState }: Document3DProps) {
  const docRef = useRef<THREE.Group>(null as any)
  const scanLineRef = useRef<THREE.Mesh>(null as any)
  const timeRef = useRef(0)
  const scanProgressRef = useRef(0)

  const paperMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#1e293b',
      metalness: 0.05,
      roughness: 0.7,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
    }), [])

  const edgeMaterial = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: '#334155',
      metalness: 0.3,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    }), [])

  const textLineMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#64748b',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }), [])

  const highlightedLineMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), [])

  const scanMaterial = useMemo(() =>
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

    if (docRef.current) {
      const floatY = Math.sin(timeRef.current * 0.8) * 0.03
      docRef.current.position.y = floatY

      if (analysisState === 'processing' || analysisState === 'analyzing') {
        docRef.current.rotation.y += delta * 0.15
      } else {
        docRef.current.rotation.y *= 0.95
      }
    }

    if ((analysisState === 'processing' || analysisState === 'analyzing') && scanLineRef.current) {
      scanProgressRef.current += delta * 0.8
      const scanY = -0.6 + (scanProgressRef.current % 1) * 1.2
      scanLineRef.current.position.y = scanY
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.4 + Math.sin(timeRef.current * 8) * 0.3
    } else if (scanLineRef.current) {
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial
      material.opacity *= 0.95
    }

    docRef.current?.children.forEach((page, i) => {
      if (!page) return
      const textLines = page.userData.textLines as THREE.Mesh[]
      if (textLines) {
        textLines.forEach((line, lineIdx) => {
          if (!line) return
          const isHighlighted = line.userData.highlighted
          const baseOpacity = isHighlighted ? 0.9 : 0.4
          const material = line.material as THREE.MeshBasicMaterial

          if (analysisState === 'processing' || analysisState === 'analyzing') {
            const wave = Math.sin(timeRef.current * 3 + lineIdx * 0.5 + i) * 0.3
            material.opacity = baseOpacity + wave * (isHighlighted ? 0.1 : 0.2)
            line.scale.x = 1 + wave * 0.05
          } else if (analysisState === 'complete') {
            const pulse = Math.sin(timeRef.current * 1.5 + lineIdx * 0.3) * 0.1
            material.opacity = baseOpacity + pulse * (isHighlighted ? 0.05 : 0.1)
          } else {
            material.opacity = baseOpacity
            line.scale.x = 1
          }
        })
      }
    })
  })

  const Page = ({ yOffset }: { yOffset: number }) => {
    const groupRef = useRef<THREE.Group>(null!)
    const linesRef = useRef<THREE.Mesh[]>([])

    useLayoutEffect(() => {
      const lines: THREE.Mesh[] = []
      const lineCount = 12
      for (let i = 0; i < lineCount; i++) {
        const width = 0.7 + Math.random() * 0.6
        const lineGeometry = new THREE.PlaneGeometry(width, 0.04)
        const isHighlighted = Math.random() < 0.15
        const lineMaterial = isHighlighted ? highlightedLineMaterial : textLineMaterial
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial)
        lineMesh.position.set(
          (Math.random() - 0.5) * 0.3,
          yOffset + 0.015,
          -0.7 + (i / (lineCount - 1)) * 1.4
        )
        lineMesh.rotation.x = -Math.PI / 2
        lineMesh.userData.highlighted = isHighlighted
        lines.push(lineMesh)
      }
      linesRef.current = lines
      if (groupRef.current) {
        groupRef.current.userData.textLines = lines
      }
    }, [yOffset])

    return (
      <group ref={groupRef}>
        <mesh
          geometry={new THREE.BoxGeometry(1.6, 0.02, 2.2)}
          material={paperMaterial}
          position={[0, yOffset, 0]}
          castShadow
          receiveShadow
        />
        <lineSegments
          geometry={new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 0.02, 2.2))}
          material={edgeMaterial}
          position={[0, yOffset, 0]}
        />
        {linesRef.current.map((line, i) => (
          <mesh
            key={i}
            geometry={line.geometry}
            material={line.material}
            position={line.position}
            rotation={line.rotation}
            userData={line.userData}
          />
        ))}
      </group>
    )
  }

  return (
    <group ref={docRef} position={[0, 0, 0]}>
      <Page yOffset={0} />
      <Page yOffset={-0.04} />
      <Page yOffset={-0.08} />

      <mesh
        ref={scanLineRef}
        geometry={new THREE.PlaneGeometry(1.5, 0.02)}
        material={scanMaterial}
        position={[0, 0, 1.15]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {analysisState === 'complete' && (
        <group position={[0, 0.5, 0]}>
          <mesh
            geometry={new THREE.RingGeometry(0.3, 0.4, 32)}
            material={new THREE.MeshBasicMaterial({
              color: '#22c55e',
              transparent: true,
              opacity: 0.6,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending,
            })}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <mesh
              geometry={new THREE.SphereGeometry(0.08, 16, 16)}
              material={new THREE.MeshBasicMaterial({
                color: '#22c55e',
                transparent: true,
                opacity: 1,
              })}
            />
          </mesh>
        </group>
      )}

      {analysisState === 'error' && (
        <group position={[0, 0.5, 0]}>
          <mesh
            geometry={new THREE.RingGeometry(0.3, 0.4, 32)}
            material={new THREE.MeshBasicMaterial({
              color: '#ef4444',
              transparent: true,
              opacity: 0.6,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending,
            })}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      )}
    </group>
  )
}