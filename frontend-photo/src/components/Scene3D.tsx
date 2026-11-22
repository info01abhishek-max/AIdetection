'use client'

import { useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { ImageAnalyzer3D } from './ImageAnalyzer3D'
import { FrequencyVisualizer3D } from './FrequencyVisualizer3D'
import { NoiseVisualizer3D } from './NoiseVisualizer3D'
import { MetadataVisualizer3D } from './MetadataVisualizer3D'
import { ELAVisualizer3D } from './ELAVisualizer3D'
import { StatisticalVisualizer3D } from './StatisticalVisualizer3D'

interface Scene3DProps {
  analysisId: string | null
  result: any
  className?: string
}

export function Scene3D({ analysisId, result, className = '' }: Scene3DProps) {
  const [activeVisualizer, setActiveVisualizer] = useState<string>('image')
  const [isReady, setIsReady] = useState(false)

  const visualizers = useMemo(() => [
    { id: 'image', label: 'IMAGE STRUCTURE', component: ImageAnalyzer3D },
    { id: 'frequency', label: 'FREQUENCY DOMAIN', component: FrequencyVisualizer3D },
    { id: 'noise', label: 'NOISE PATTERNS', component: NoiseVisualizer3D },
    { id: 'metadata', label: 'METADATA MAP', component: MetadataVisualizer3D },
    { id: 'ela', label: 'ERROR LEVEL ANALYSIS', component: ELAVisualizer3D },
    { id: 'statistical', label: 'STATISTICAL ANOMALIES', component: StatisticalVisualizer3D },
  ], [])

  useEffect(() => {
    if (result) {
      setIsReady(true)
    }
  }, [result])

  if (!analysisId || !isReady) {
    return (
      <div className={`w-full h-[400px] md:h-[500px] ${className}`}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          className="w-full h-full"
        >
          <Suspense fallback={<LoadingFallback />}>
            <Scene3DContent result={null} activeVisualizer="image" />
          </Suspense>
        </Canvas>
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
          {visualizers.map((v) => (
            <button
              key={v.id}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                v.id === 'image'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
              }`}
              disabled
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-[400px] md:h-[500px] ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="w-full h-full"
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene3DContent result={result} activeVisualizer={activeVisualizer} />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center px-4">
        {visualizers.map((v) => (
          <motion.button
            key={v.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveVisualizer(v.id)}
            className={`
              px-4 py-2 rounded-full text-xs font-mono transition-all
              flex items-center gap-1.5
              ${activeVisualizer === v.id
                ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/80 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-200'
              }
            `}
          >
            {activeVisualizer === v.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            {v.label}
          </motion.button>
        ))}
      </div>

      <div className="absolute top-4 right-4">
        <div className="glass rounded-xl p-3 min-w-[200px]">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">ACTIVE VISUALIZER</p>
          <p className="font-semibold text-white text-sm">
            {visualizers.find(v => v.id === activeVisualizer)?.label}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {getVisualizerDescription(activeVisualizer)}
          </p>
        </div>
      </div>
    </div>
  )
}

function Scene3DContent({ result, activeVisualizer }: { result: any; activeVisualizer: string }) {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color(0x020617)
    scene.fog = new THREE.FogExp2(0x020617, 0.1)
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7]} intensity={1} color="#22d3ee" />
      <directionalLight position={[-5, -5, -5]} intensity={0.5} color="#a855f7" />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        autoRotate={activeVisualizer === 'image'}
        autoRotateSpeed={0.2}
      />

      <GridHelper />
      <CoordinateAxes />

      {activeVisualizer === 'image' && <ImageAnalyzer3D result={result} />}
      {activeVisualizer === 'frequency' && <FrequencyVisualizer3D result={result} />}
      {activeVisualizer === 'noise' && <NoiseVisualizer3D result={result} />}
      {activeVisualizer === 'metadata' && <MetadataVisualizer3D result={result} />}
      {activeVisualizer === 'ela' && <ELAVisualizer3D result={result} />}
      {activeVisualizer === 'statistical' && <StatisticalVisualizer3D result={result} />}
    </>
  )
}

function GridHelper() {
  return (
    <group>
      <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[0, -2, 0]} />
      <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[-2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
    </group>
  )
}

function CoordinateAxes() {
  const length = 3
  return (
    <group>
      <arrowHelper args={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), length, 0xef4444, 0.3, 0.15]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), length, 0x22c55e, 0.3, 0.15]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1), length, 0x3b82f6, 0.3, 0.15]} />
      <Html position={[length + 0.3, 0, 0]} className="text-red-400 text-xs font-mono">X</Html>
      <Html position={[0, length + 0.3, 0]} className="text-green-400 text-xs font-mono">Y</Html>
      <Html position={[0, 0, length + 0.3]} className="text-cyan-400 text-xs font-mono">Z</Html>
    </group>
  )
}

function LoadingFallback() {
  return (
    <Html className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-mono text-sm">INITIALIZING 3D ENGINE...</p>
      </div>
    </Html>
  )
}

function getVisualizerDescription(id: string): string {
  const descriptions: Record<string, string> = {
    image: '3D representation of image structure and pixel relationships',
    frequency: 'Frequency domain analysis showing DCT/FFT coefficients',
    noise: 'Sensor noise pattern visualization and PRNU analysis',
    metadata: 'EXIF and metadata structure mapped in 3D space',
    ela: 'Error Level Analysis showing compression artifacts',
    statistical: 'Statistical anomaly detection across image regions',
  }
  return descriptions[id] || ''
}