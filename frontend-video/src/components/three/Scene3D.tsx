'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import { motion } from 'framer-motion';
import { VideoAnalyzer3D } from './VideoAnalyzer3D';
import { FrameTimeline3D } from './FrameTimeline3D';
import { FloatingParticles } from './FloatingParticles';
import { GridBackground } from './GridBackground';

interface Scene3DProps {
  className?: string;
  frameCount?: number;
  analysisProgress?: number;
  currentFrame?: number;
  detectorResults?: Record<string, number>;
}

export function Scene3D({
  className = '',
  frameCount = 0,
  analysisProgress = 0,
  currentFrame = 0,
  detectorResults = {},
}: Scene3DProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 3, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ touchAction: 'none' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <color attach="background" args={['#020617']} />
          <fog attach="fog" args={['#020617', 0.02, 50]} />

          <GridBackground />
          <FloatingParticles count={80} />

          <VideoAnalyzer3D
            analysisProgress={analysisProgress}
            detectorResults={detectorResults}
          />

          <FrameTimeline3D frameCount={frameCount} currentFrame={currentFrame} />

          <ContactShadows
            position={[0, -2, 0]}
            opacity={0.15}
            scale={20}
            blur={2}
            far={10}
          />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={20}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2 - 0.1}
            autoRotate={false}
            autoRotateSpeed={0.2}
          />
        </motion.div>

        <Html
          position={[0, -2.5, 0]}
          transform
          sprite
          style={{
            pointerEvents: 'none',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <div>AI Video Authenticity Analyzer</div>
          <div className="text-cyan-400">Frame-level & Temporal Analysis</div>
        </Html>
      </Canvas>
    </div>
  );
}