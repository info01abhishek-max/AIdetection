'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { Microphone3D } from './Microphone3D'
import { Waveform3D } from './Waveform3D'
import { HolographicWaveformRing } from './HolographicWaveformRing'
import { FloatingParticles } from '../FloatingParticles'
import { GridBackground } from '../GridBackground'

type AnalysisState = 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'
type ThreeAnalysisState = 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'

interface Scene3DProps {
  audioData?: Float32Array
  analysisState: AnalysisState
  audioLevel?: number
  progress?: number
  className?: string
}

export function Scene3D({
  audioData,
  analysisState,
  audioLevel = 0,
  progress = 0,
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
    ([0, 0, 10] as const), [])

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
            minDistance={5}
            maxDistance={25}
            autoRotate={!prefersReducedMotion}
            autoRotateSpeed={0.2}
            dampingFactor={0.05}
          />

          <GridBackground size={40} divisions={80} opacity={0.02} />
          <FloatingParticles count={200} radius={8} speed={0.08} />

          <group position={[0, 0, 0]}>
            <HolographicWaveformRing
              analysisState={threeAnalysisState}
              progress={progress}
              color="#06b6d4"
              radius={2.5}
            />

            <Waveform3D
              audioData={audioData}
              analysisState={threeAnalysisState}
              color="#06b6d4"
            />

            <Microphone3D
              analysisState={threeAnalysisState}
              audioLevel={audioLevel}
            />
          </group>

          <Html position={[0, -4, 0]} center>
            <div className="pointer-events-none" style={{ opacity: prefersReducedMotion ? 1 : 0.6 }}>
              <div className="text-center px-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                  {analysisState === 'idle' && 'AWAITING AUDIO'}
                  {analysisState === 'uploading' && 'UPLOADING...'}
                  {analysisState === 'scanning' && 'SCANNING AUDIO'}
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
            <p className="text-slate-500 text-sm font-mono">INITIALIZING AUDIO SCANNER...</p>
          </div>
        </div>
      )}
    </div>
  )
}