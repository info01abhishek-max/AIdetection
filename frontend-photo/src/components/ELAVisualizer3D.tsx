'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface ELAVisualizer3DProps {
  result: any
}

export function ELAVisualizer3D({ result }: ELAVisualizer3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const elaMeshRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null>(null)
  const blocksRef = useRef<THREE.InstancedMesh | null>(null)
  const timeRef = useRef(0)

  const gridSize = useMemo(() => 16, [])
  const blockCount = gridSize * gridSize

  const elaDetails = useMemo(() => {
    return result?.detectors?.find((d: any) => d.name === 'Error Level Analysis')?.details || {}
  }, [result])

  const meanError = elaDetails?.mean_error_level || 0
  const maxError = elaDetails?.max_error_level || 0
  const suspiciousRegions = elaDetails?.suspicious_regions || 0
  const quality = elaDetails?.estimated_quality || 85

  useEffect(() => {
    if (!groupRef.current) return

    const geometry = new THREE.PlaneGeometry(8, 8, gridSize - 1, gridSize - 1)
    geometry.attributes.position.array

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMeanError: { value: meanError },
        uMaxError: { value: maxError },
        uQuality: { value: quality / 100 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float uTime;
        uniform float uMeanError;
        uniform float uMaxError;
        uniform float uQuality;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vUv = uv;

          float noise = random(position.xz * 2.0 + uTime * 0.1);
          float elevation = noise * uMeanError * 2.0;
          elevation += sin(position.x * 3.0 + uTime) * cos(position.z * 3.0 + uTime) * uMaxError * 0.5;

          vElevation = elevation;

          vec3 newPosition = position;
          newPosition.y += elevation;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float uTime;
        uniform float uMeanError;
        uniform float uMaxError;
        uniform float uQuality;

        void main() {
          float intensity = vElevation / (uMaxError + 0.001);
          intensity = clamp(intensity, 0.0, 1.0);

          vec3 cold = vec3(0.1, 0.3, 0.8);
          vec3 hot = vec3(1.0, 0.2, 0.1);
          vec3 color = mix(cold, hot, intensity);

          float grid = step(0.95, fract(vUv.x * 16.0)) + step(0.95, fract(vUv.y * 16.0));
          color = mix(color, vec3(0.0), grid * 0.3);

          float pulse = sin(uTime * 3.0 + intensity * 10.0) * 0.1 + 0.9;
          color *= pulse;

          gl_FragColor = vec4(color, 0.8 - intensity * 0.3);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    elaMeshRef.current = mesh
    groupRef.current.add(mesh)

    const blockGeometry = new THREE.BoxGeometry(0.45, 0.1, 0.45)
    const blockMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
    })

    const blocks = new THREE.InstancedMesh(blockGeometry, blockMaterial, blockCount)
    blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    blocksRef.current = blocks

    const dummy = new THREE.Object3D()
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j
        const x = (i - gridSize / 2 + 0.5) * 0.5
        const z = (j - gridSize / 2 + 0.5) * 0.5

        dummy.position.set(x, 0.05, z)
        dummy.scale.set(1, 0.1, 1)
        dummy.updateMatrix()
        blocks.setMatrixAt(index, dummy.matrix)
      }
    }
    blocks.instanceMatrix.needsUpdate = true
    groupRef.current.add(blocks)

    return () => {
      if (elaMeshRef.current) {
        groupRef.current?.remove(elaMeshRef.current)
        elaMeshRef.current.geometry.dispose()
        ;(elaMeshRef.current.material as THREE.Material).dispose()
      }
      if (blocksRef.current) {
        groupRef.current?.remove(blocksRef.current)
        blocksRef.current.geometry.dispose()
        ;(blocksRef.current.material as THREE.Material).dispose()
      }
    }
  }, [result, gridSize, blockCount, meanError, maxError, quality])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (elaMeshRef.current) {
      ;(elaMeshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = timeRef.current
      elaMeshRef.current.rotation.z += delta * 0.01
    }

    if (blocksRef.current) {
      const dummy = new THREE.Object3D()
      const suspiciousCount = Math.min(suspiciousRegions, blockCount)

      for (let i = 0; i < blockCount; i++) {
        blocksRef.current.getMatrixAt(i, dummy.matrix)
        dummy.position.y = 0.05

        if (i < suspiciousCount) {
          const height = 0.1 + Math.sin(timeRef.current * 3 + i) * 0.5 * (meanError + 0.1)
          dummy.scale.y = Math.max(0.1, height)
          ;(blocksRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8
        } else {
          dummy.scale.y = 0.1
          ;(blocksRef.current.material as THREE.MeshBasicMaterial).opacity = 0
        }

        dummy.updateMatrix()
        blocksRef.current.setMatrixAt(i, dummy.matrix)
      }
      blocksRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -5.5, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <div className="glass px-4 py-2 rounded-xl text-xs">
          <p className="font-mono text-cyan-400 uppercase tracking-wider">ERROR LEVEL ANALYSIS (ELA)</p>
          <div className="flex justify-center gap-4 mt-1 text-slate-400 text-xs flex-wrap">
            <span>Mean Error: {meanError.toFixed(4)}</span>
            <span>Max Error: {maxError.toFixed(4)}</span>
            <span>Suspicious Regions: {suspiciousRegions}</span>
            <span>Quality: {quality}</span>
          </div>
        </div>
      </Html>
    </group>
  )
}