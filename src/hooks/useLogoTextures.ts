import { useMemo } from 'react'
import {
  CanvasTexture,
  SRGBColorSpace,
  LinearSRGBColorSpace,
  TextureLoader,
} from 'three'

interface LogoTextures {
  colorTexture: CanvasTexture
  normalMap: CanvasTexture
  imageData: ImageData
}

export function useLogoTextures(
  imageUrl: string,
  threshold: number = 18
): LogoTextures | null {
  return useMemo(() => {
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
      if (brightness < threshold) d[i + 3] = 0
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
      const i = (cy * w + cx) * 4
      return (d[i] + d[i + 1] + d[i + 2]) / 765
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = bright(x + 1, y) - bright(x - 1, y)
        const dy = bright(x, y + 1) - bright(x, y - 1)
        const len = Math.sqrt(dx * dx + dy * dy + 1)
        const i = (y * w + x) * 4
        nd[i] = ((-dx / len) * 0.5 + 0.5) * 255
        nd[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
        nd[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
        nd[i + 3] = d[i + 3]
      }
    }

    nCtx.putImageData(normalData, 0, 0)
    const normalMap = new CanvasTexture(normalCanvas)
    normalMap.colorSpace = LinearSRGBColorSpace

    return { colorTexture, normalMap, imageData }
  }, [imageUrl, threshold])
}

export function loadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useLoadedImage(imageUrl: string): HTMLImageElement | null {
  return useMemo(() => {
    if (!imageUrl) return null
    const img = new Image()
    img.src = imageUrl
    return img.complete ? img : null
  }, [imageUrl])
}
