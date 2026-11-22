'use client'

import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { ImageAnalyzer3D } from './ImageAnalyzer3D'

type AnalysisState = 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'
type ThreeAnalysisState = 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'

interface Scene3DProps {
  texture: THREE.Texture | null
  analysisState: AnalysisState
  onCardClick?: () => void
  className?: string
}

export function Scene3D({
  texture,
  analysisState,
  onCardClick,
  className
}: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    setCanvasReady(true)
  }, [])

  const cameraPosition = useMemo(() =>
    ([0, 0, 8] as const), [])

  const threeAnalysisState = useMemo((): ThreeAnalysisState => {
    if (analysisState === 'uploading') return 'idle'
    return analysisState as ThreeAnalysisState
  }, [analysisState])

  return (
    <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      {canvasReady && (
        <Canvas
          camera={{ position: cameraPosition, fov: 45, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
          }}
          shadows={{ enabled: false }}
          style={{ outline: 'none' }}
        >
          <color attach="background" args={['#020617']} />
          <fog attach="fog" args={['#020617', 5, 50]} />

          <directionalLight position={[5, 10, 7]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-5, 5, -7]} intensity={0.5} color="#06b6d4" />
          <ambientLight color="#1e293b" intensity={0.8} />
          <hemisphereLight color="#06b6d4" groundColor="#0f172a" intensity={0.3} />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={!prefersReducedMotion}
            minDistance={4}
            maxDistance={20}
            autoRotate={!prefersReducedMotion}
            autoRotateSpeed={0.3}
            dampingFactor={0.05}
          />

          <ImageAnalyzer3D
            texture={texture}
            analysisState={threeAnalysisState}
            onCardClick={onCardClick}
          />

          <Html position={[0, -3.5, 0]} center>
            <div className="pointer-events-none" style={{ opacity: prefersReducedMotion ? 1 : 0.6 }}>
              <div className="text-center px-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                  {analysisState === 'idle' && 'AWAITING IMAGE'}
                  {analysisState === 'uploading' && 'UPLOADING...'}
                  {analysisState === 'scanning' && 'SCANNING IMAGE'}
                  {analysisState === 'analyzing' && 'ANALYZING PATTERNS'}
                  {analysisState === 'complete' && 'ANALYSIS COMPLETE'}
                  {analysisState === 'error' && 'ERROR DETECTED'}
                </p>
              </div>
            </div>
          </Html>
        </Canvas>
      )}
      {!canvasReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-950">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-mono">INITIALIZING SCANNER...</p>
          </div>
        </div>
      )}
    </div>
  )
}