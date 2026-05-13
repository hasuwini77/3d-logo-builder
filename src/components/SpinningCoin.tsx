import { useRef, useMemo, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import {
  Group,
  Vector2,
  FrontSide,
  DoubleSide,
  CanvasTexture,
  SRGBColorSpace,
  LinearSRGBColorSpace,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import { extractPerimeter } from '../utils/perimeter'
import { buildRim } from '../utils/rim'

const PLANE_SIZE = 4.8

export interface CoinSettings {
  spinSpeed: number
  thickness: number
  embossStrength: number
  bgThreshold: number
  rimColor: string
  rimEmissive: string
  environment: 'warehouse' | 'studio' | 'city' | 'night' | 'dawn' | 'sunset'
}

export const DEFAULT_SETTINGS: CoinSettings = {
  spinSpeed: 0.35,
  thickness: 0.45,
  embossStrength: 1.5,
  bgThreshold: 18,
  rimColor: '#8ecae6',
  rimEmissive: '#06b6d4',
  environment: 'warehouse',
}

export interface CoinHandle {
  getCanvas: () => HTMLCanvasElement | null
  setExportMode: (active: boolean, speed?: number) => void
  resetRotation: () => void
}

interface CoinMeshProps {
  imageUrl: string
  settings: CoinSettings
  handle: React.RefObject<CoinHandle | null>
}

function CoinMesh({ imageUrl, settings, handle }: CoinMeshProps) {
  const groupRef = useRef<Group>(null)
  const exportModeRef = useRef(false)
  const exportSpeedRef = useRef(0)

  useImperativeHandle(handle, () => ({
    getCanvas: () => null,
    setExportMode: (active: boolean, speed?: number) => {
      exportModeRef.current = active
      if (speed !== undefined) exportSpeedRef.current = speed
    },
    resetRotation: () => {
      if (groupRef.current) groupRef.current.rotation.y = 0
    },
  }))

  const processed = useMemo(() => {
    if (!imageUrl) return null

    const img = new Image()
    img.src = imageUrl
    if (!img.complete) return null

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data

    for (let i = 0; i < d.length; i += 4) {
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3
      if (brightness < settings.bgThreshold) d[i + 3] = 0
    }
    ctx.putImageData(imageData, 0, 0)

    const colorTexture = new CanvasTexture(canvas)
    colorTexture.colorSpace = SRGBColorSpace

    const w = canvas.width
    const h = canvas.height
    const normalCanvas = document.createElement('canvas')
    normalCanvas.width = w
    normalCanvas.height = h
    const nCtx = normalCanvas.getContext('2d')!
    const normalData = nCtx.createImageData(w, h)
    const nd = normalData.data

    const bright = (x: number, y: number) => {
      const cx = Math.max(0, Math.min(w - 1, x))
      const cy = Math.max(0, Math.min(h - 1, y))
      const idx = (cy * w + cx) * 4
      return (d[idx] + d[idx + 1] + d[idx + 2]) / 765
    }

    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        const dx = bright(x2 + 1, y2) - bright(x2 - 1, y2)
        const dy = bright(x2, y2 + 1) - bright(x2, y2 - 1)
        const len = Math.sqrt(dx * dx + dy * dy + 1)
        const idx = (y2 * w + x2) * 4
        nd[idx] = ((-dx / len) * 0.5 + 0.5) * 255
        nd[idx + 1] = ((-dy / len) * 0.5 + 0.5) * 255
        nd[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255
        nd[idx + 3] = d[idx + 3]
      }
    }

    nCtx.putImageData(normalData, 0, 0)
    const normalMap = new CanvasTexture(normalCanvas)
    normalMap.colorSpace = LinearSRGBColorSpace

    const perimeter = extractPerimeter(imageData.data, w, h)
    const rimGeometry = buildRim(perimeter, PLANE_SIZE, settings.thickness)

    return { colorTexture, normalMap, rimGeometry }
  }, [imageUrl, settings.bgThreshold, settings.thickness])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const speed = exportModeRef.current
      ? exportSpeedRef.current
      : settings.spinSpeed
    groupRef.current.rotation.y += delta * speed
  })

  if (!processed) return null

  const half = settings.thickness / 2
  const emboss = new Vector2(settings.embossStrength, settings.embossStrength)

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, half]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshStandardMaterial
          map={processed.colorTexture}
          normalMap={processed.normalMap}
          normalScale={emboss}
          metalness={0.15}
          roughness={0.35}
          envMapIntensity={0.4}
          side={FrontSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, -half]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshStandardMaterial
          map={processed.colorTexture}
          normalMap={processed.normalMap}
          normalScale={emboss}
          metalness={0.15}
          roughness={0.35}
          envMapIntensity={0.4}
          side={FrontSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={processed.rimGeometry}>
        <meshStandardMaterial
          color={settings.rimColor}
          metalness={1.0}
          roughness={0.12}
          emissive={settings.rimEmissive}
          emissiveIntensity={0.15}
          envMapIntensity={1.5}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

interface SpinningCoinProps {
  imageUrl: string | null
  settings: CoinSettings
  coinRef: React.RefObject<CoinHandle | null>
}

export default function SpinningCoin({
  imageUrl,
  settings,
  coinRef,
}: SpinningCoinProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 40 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={2.5} />
      <directionalLight position={[-3, -2, 4]} intensity={0.8} color="#06b6d4" />
      <directionalLight position={[0, 0, -5]} intensity={0.5} color="#0ea5e9" />
      <Environment preset={settings.environment} />
      {imageUrl && (
        <CoinMesh
          imageUrl={imageUrl}
          settings={settings}
          handle={coinRef}
        />
      )}
    </Canvas>
  )
}
