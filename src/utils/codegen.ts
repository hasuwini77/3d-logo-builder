import type { CoinSettings } from '../components/SpinningCoin'

export function generateComponentCode(
  imageDataUrl: string,
  settings: CoinSettings
): string {
  return `import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import {
  Group, Vector2, FrontSide, DoubleSide,
  CanvasTexture, SRGBColorSpace, LinearSRGBColorSpace,
  BufferGeometry, Float32BufferAttribute,
} from 'three'

// --- Tunable constants ---
const PLANE_SIZE = 4.8
const THICKNESS = ${settings.thickness}
const SPIN_SPEED = ${settings.spinSpeed}
const BG_THRESHOLD = ${settings.bgThreshold}
const EMBOSS_STRENGTH = ${settings.embossStrength}
const RIM_COLOR = '${settings.rimColor}'
const RIM_EMISSIVE = '${settings.rimEmissive}'
const ENVIRONMENT = '${settings.environment}'
const HAS_TEXT = ${settings.hasText}

// --- Embedded logo (base64) ---
const LOGO_SRC = '${imageDataUrl}'

function extractPerimeter(data: Uint8ClampedArray, w: number, h: number): [number, number][] {
  const grid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) grid[i] = data[i * 4 + 3] > 0 ? 1 : 0
  const sample = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h ? grid[y * w + x] : 0
  let sx = -1, sy = -1
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sample(x, y)) { sx = x; sy = y; break outer }
  if (sx === -1) return []
  const pts: [number, number][] = []
  let cx = sx - 1, cy = sy - 1, pd = 0
  for (let s = 0; s < 2 * (w + h) * 8; s++) {
    const c = (sample(cx, cy) << 3) | (sample(cx+1, cy) << 2) | (sample(cx+1, cy+1) << 1) | sample(cx, cy+1)
    pts.push([cx + 1, cy + 1])
    let nd: number
    switch (c) {
      case 1: nd=0; break; case 2: nd=1; break; case 3: nd=0; break; case 4: nd=3; break
      case 5: nd=3; break; case 6: nd=pd===0?1:3; break; case 7: nd=0; break; case 8: nd=2; break
      case 9: nd=pd===1?0:2; break; case 10: nd=1; break; case 11: nd=1; break; case 12: nd=2; break
      case 13: nd=2; break; case 14: nd=3; break; default: nd=pd
    }
    if (nd===0) cx++; else if (nd===1) cy++; else if (nd===2) cx--; else cy--
    pd = nd
    if (s > 0 && cx === sx - 1 && cy === sy - 1) break
  }
  const step = Math.max(1, Math.floor(pts.length / 800))
  let sampled = pts.filter((_, i) => i % step === 0).map(([px, py]) => [px / w - 0.5, 0.5 - py / h] as [number, number])
  for (let iter = 0; iter < 3; iter++) {
    const n = sampled.length; const next: [number, number][] = []
    for (let i = 0; i < n; i++) {
      const p = sampled[(i-1+n)%n], c = sampled[i], nx = sampled[(i+1)%n]
      next.push([c[0]+0.5*((p[0]+nx[0])/2-c[0]), c[1]+0.5*((p[1]+nx[1])/2-c[1])])
    }
    sampled = next
  }
  return sampled
}

function buildRim(outline: [number, number][]) {
  const half = THICKNESS / 2, s = PLANE_SIZE, n = outline.length
  const pos: number[] = [], nrm: number[] = [], idx: number[] = []
  for (let i = 0; i < n; i++) {
    const prev = outline[(i-1+n)%n], curr = outline[i], next = outline[(i+1)%n]
    const tx = next[0]-prev[0], ty = next[1]-prev[1]
    const len = Math.sqrt(tx*tx+ty*ty)||1
    const nx = ty/len, ny = -tx/len, x = curr[0]*s, y = curr[1]*s
    pos.push(x,y,half); nrm.push(nx,ny,0)
    pos.push(x,y,-half); nrm.push(nx,ny,0)
  }
  for (let i = 0; i < n; i++) {
    const i2 = (i+1)%n
    idx.push(i*2, i*2+1, i2*2, i*2+1, i2*2+1, i2*2)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
  geo.setIndex(idx)
  return geo
}

function Coin() {
  const groupRef = useRef<Group>(null)
  const processed = useMemo(() => {
    const img = new Image(); img.src = LOGO_SRC
    if (!img.complete) return null
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i]+d[i+1]+d[i+2])/3 < BG_THRESHOLD) d[i+3] = 0
    }
    ctx.putImageData(imageData, 0, 0)
    const colorTex = new CanvasTexture(canvas); colorTex.colorSpace = SRGBColorSpace
    const w = canvas.width, h = canvas.height
    const nc = document.createElement('canvas'); nc.width = w; nc.height = h
    const nCtx = nc.getContext('2d')!; const nd = nCtx.createImageData(w, h).data.slice()
    const nData = nCtx.createImageData(w, h); const ndd = nData.data
    const bright = (x: number, y: number) => {
      const cx = Math.max(0, Math.min(w-1, x)), cy = Math.max(0, Math.min(h-1, y))
      const i = (cy*w+cx)*4; return (d[i]+d[i+1]+d[i+2])/765
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = bright(x+1,y)-bright(x-1,y), dy = bright(x,y+1)-bright(x,y-1)
      const len = Math.sqrt(dx*dx+dy*dy+1), i = (y*w+x)*4
      ndd[i]=((-dx/len)*0.5+0.5)*255; ndd[i+1]=((-dy/len)*0.5+0.5)*255
      ndd[i+2]=((1/len)*0.5+0.5)*255; ndd[i+3]=d[i+3]
    }
    nCtx.putImageData(nData, 0, 0)
    const normalMap = new CanvasTexture(nc); normalMap.colorSpace = LinearSRGBColorSpace
    const perim = extractPerimeter(imageData.data, w, h)
    return { colorTex, normalMap, rimGeo: buildRim(perim) }
  }, [])
  useFrame((_, delta) => { if (groupRef.current) groupRef.current.rotation.y += delta * SPIN_SPEED })
  if (!processed) return null
  const half = THICKNESS / 2, emboss = new Vector2(EMBOSS_STRENGTH, EMBOSS_STRENGTH)
  return (
    <group ref={groupRef}>
      <mesh position={[0,0,half]}><planeGeometry args={[PLANE_SIZE,PLANE_SIZE]} />
        <meshStandardMaterial map={processed.colorTex} normalMap={processed.normalMap} normalScale={emboss}
          metalness={0.15} roughness={0.35} envMapIntensity={0.4} side={FrontSide} transparent depthWrite={false} /></mesh>
      <mesh position={[0,0,-half]} rotation={[0,Math.PI,0]} scale={HAS_TEXT ? [1,1,1] : [-1,1,1]}><planeGeometry args={[PLANE_SIZE,PLANE_SIZE]} />
        <meshStandardMaterial map={processed.colorTex} normalMap={processed.normalMap} normalScale={emboss}
          metalness={0.15} roughness={0.35} envMapIntensity={0.4} side={FrontSide} transparent depthWrite={false} /></mesh>
      <mesh geometry={processed.rimGeo}>
        <meshStandardMaterial color={RIM_COLOR} metalness={1} roughness={0.12}
          emissive={RIM_EMISSIVE} emissiveIntensity={0.15} envMapIntensity={1.5} side={DoubleSide} /></mesh>
    </group>
  )
}

export default function SpinningLogo3D({ size = 540 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0,0,7], fov: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5,5,5]} intensity={2.5} />
        <directionalLight position={[-3,-2,4]} intensity={0.8} color="#06b6d4" />
        <directionalLight position={[0,0,-5]} intensity={0.5} color="#0ea5e9" />
        <Environment preset={ENVIRONMENT as any} />
        <Coin />
      </Canvas>
    </div>
  )
}

// Usage: <SpinningLogo3D size={540} />
// Dependencies: npm install three @react-three/fiber @react-three/drei
`
}
