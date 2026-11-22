'use client'

import { Canvas, extend } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Document3D } from './Document3D'
import { AIScanner3D } from './AIScanner3D'
import { HolographicTextLayers } from './HolographicTextLayers'
import { useMemo } from 'react'

extend({ OrbitControls })

interface Scene3DProps {
  analysisState: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  aiProbability?: number
  progress?: number
}

export function Scene3D({ analysisState, aiProbability = 0, progress = 0 }: Scene3DProps) {
  const sceneContent = useMemo(() => (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 10, 50]} />

      <ambientLight color="#1e293b" intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1.2} color="#ffffff" castShadow />
      <directionalLight position={[-5, 5, -7]} intensity={0.4} color="#06b6d4" />
      <hemisphereLight color="#06b6d4" groundColor="#0f172a" intensity={0.3} />
      <pointLight position={[0, 3, 5]} color="#8b5cf6" intensity={0.5} distance={20} decay={2} />

      <Stars radius={50} depth={100} count={2000} factor={4} saturation={0} />

      <group position={[-2, 0, 0]}>
        <Document3D analysisState={analysisState} progress={progress} />
      </group>

      <AIScanner3D analysisState={analysisState} intensity={analysisState === 'analyzing' ? 1.5 : 1} />

      <HolographicTextLayers analysisState={analysisState} aiProbability={aiProbability} />

      <mesh
        geometry={new THREE.PlaneGeometry(20, 20)}
        material={new THREE.ShadowMaterial({ opacity: 0.1 })}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.5, 0]}
        receiveShadow
      />
    </>
  ), [analysisState, aiProbability, progress])

  return (
    <Canvas
      camera={{ position: [0, 1, 8], fov: 45, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      }}
      shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
      style={{ outline: 'none', width: '100%', height: '100%' }}
    >
      {sceneContent}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minZoom={0.5}
        maxZoom={3}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
        autoRotate={analysisState === 'idle' || analysisState === 'complete'}
        autoRotateSpeed={0.2}
        dampingFactor={0.05}
      />
    </Canvas>
  )
}