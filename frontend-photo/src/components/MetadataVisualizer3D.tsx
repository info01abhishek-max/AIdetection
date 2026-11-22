'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface MetadataVisualizer3DProps {
  result: any
}

export function MetadataVisualizer3D({ result }: MetadataVisualizer3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const nodesRef = useRef<THREE.Object3D[]>([])
  const timeRef = useRef(0)

  const metadataDetails = useMemo(() => {
    return result?.detectors?.find((d: any) => d.name === 'EXIF Metadata Analysis')?.details || {}
  }, [result])

  const hasExif = metadataDetails?.has_exif !== false
  const software = metadataDetails?.software || 'Unknown'
  const camera = metadataDetails?.camera_model || 'Unknown'
  const timestamp = metadataDetails?.timestamp || 'Unknown'
  const gps = metadataDetails?.gps || null
  const strippedFields = metadataDetails?.stripped_fields || []

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const centerGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: hasExif ? 0x22c55e : 0xef4444,
      transparent: true,
      opacity: 0.8,
    })
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial)
    group.add(centerMesh)
    nodesRef.current.push(centerMesh)

    const fields = [
      { key: 'camera', label: 'CAMERA', value: camera, color: 0x3b82f6 },
      { key: 'software', label: 'SOFTWARE', value: software, color: software.toLowerCase().includes('ai') || software.toLowerCase().includes('photoshop') ? 0xef4444 : 0x22c55e },
      { key: 'timestamp', label: 'TIMESTAMP', value: timestamp, color: 0xf59e0b },
      { key: 'gps', label: 'GPS', value: gps ? 'Present' : 'Absent', color: gps ? 0x22c55e : 0xf59e0b },
    ]

    fields.forEach((field, index) => {
      const angle = (index / fields.length) * Math.PI * 2
      const radius = 3

      const nodeGroup = new THREE.Group()

      const nodeGeometry = new THREE.OctahedronGeometry(0.3, 1)
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: field.color,
        transparent: true,
        opacity: 0.9,
        wireframe: true,
      })
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial)
      nodeGroup.add(nodeMesh)

      const ringGeometry = new THREE.RingGeometry(0.4, 0.5, 32)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: field.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      })
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial)
      ringMesh.rotation.x = -Math.PI / 2
      nodeGroup.add(ringMesh)

      nodeGroup.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 1,
        Math.sin(angle) * radius
      )
      nodeGroup.userData = { angle, radius, field, baseY: nodeGroup.position.y }

      const lineGeometry = new THREE.BufferGeometry()
      const linePositions = new Float32Array([
        0, 0, 0,
        Math.cos(angle) * radius, 0, Math.sin(angle) * radius
      ])
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
      const lineMaterial = new THREE.LineBasicMaterial({
        color: field.color,
        transparent: true,
        opacity: 0.4,
      })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      group.add(line)

      group.add(nodeGroup)
      nodesRef.current.push(nodeGroup)
    })

    if (strippedFields.length > 0) {
      const strippedGroup = new THREE.Group()

      strippedFields.forEach((field: string, index: number) => {
        const angle = (index / strippedFields.length) * Math.PI * 2 + Math.PI / strippedFields.length
        const radius = 4.5

        const geometry = new THREE.TetrahedronGeometry(0.15, 0)
        const material = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.7,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2,
          Math.sin(angle) * radius
        )
        mesh.userData = { angle, radius, field, type: 'stripped' }
        strippedGroup.add(mesh)
      })

      group.add(strippedGroup)
      nodesRef.current.push(strippedGroup)
    }

    return () => {
      nodesRef.current.forEach(node => {
        group.remove(node)
        node.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            ;(child.material as THREE.Material).dispose()
          }
          if (child instanceof THREE.Line) {
            child.geometry.dispose()
            ;(child.material as THREE.Material).dispose()
          }
        })
      })
      nodesRef.current = []
    }
  }, [metadataDetails, hasExif, camera, software, timestamp, gps, strippedFields])

  useFrame((_, delta) => {
    timeRef.current += delta

    nodesRef.current.forEach((node, index) => {
      if (node.userData?.angle !== undefined) {
        node.userData.angle += delta * 0.2
        node.position.x = Math.cos(node.userData.angle) * node.userData.radius
        node.position.z = Math.sin(node.userData.angle) * node.userData.radius
        node.position.y = node.userData.baseY + Math.sin(timeRef.current * 2 + index) * 0.2

        node.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.rotation.x += delta * 0.5
            child.rotation.y += delta * 0.3
          }
        })
      } else if (node.children) {
        node.children.forEach((child: THREE.Object3D) => {
          if (child.userData?.type === 'stripped') {
            child.userData.angle += delta * 0.15
            child.position.x = Math.cos(child.userData.angle) * child.userData.radius
            child.position.z = Math.sin(child.userData.angle) * child.userData.radius
            child.rotation.y += delta
            child.scale.setScalar(1 + 0.3 * Math.sin(timeRef.current * 3 + child.userData.field))
          }
        })
      }
    })

    const group = groupRef.current
    if (group) {
      group.rotation.y += delta * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      <Html
        position={[0, -5.5, 0]}
        className="text-center pointer-events-none"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <div className="glass px-4 py-2 rounded-xl text-xs max-w-xs">
          <p className="font-mono text-cyan-400 uppercase tracking-wider">METADATA MAP (EXIF)</p>
          <div className="flex justify-center gap-3 mt-1 text-slate-400 text-xs flex-wrap">
            <span className={hasExif ? 'text-green-400' : 'text-red-400'}>
              {hasExif ? 'EXIF PRESENT' : 'EXIF STRIPPED'}
            </span>
            {strippedFields.length > 0 && (
              <span className="text-red-400">{strippedFields.length} FIELDS REMOVED</span>
            )}
          </div>
        </div>
      </Html>
    </group>
  )
}