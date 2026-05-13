export function extractPerimeter(
  data: Uint8ClampedArray,
  width: number,
  height: number
): [number, number][] {
  const rightEdge: [number, number][] = []
  const leftEdge: [number, number][] = []

  for (let y = 0; y < height; y++) {
    let left = -1
    let right = -1
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (left === -1) left = x
        right = x
      }
    }
    if (left !== -1 && right > left) {
      rightEdge.push([right, y])
      leftEdge.push([left, y])
    }
  }

  const raw = [...rightEdge, ...leftEdge.reverse()]
  const step = Math.max(1, Math.floor(raw.length / 800))
  const sampled = raw
    .filter((_, i) => i % step === 0)
    .map(
      ([px, py]) =>
        [px / width - 0.5, 0.5 - py / height] as [number, number]
    )

  return smoothOutline(sampled, 5)
}

function smoothOutline(
  outline: [number, number][],
  iterations: number
): [number, number][] {
  let pts = outline
  for (let iter = 0; iter < iterations; iter++) {
    const n = pts.length
    const next: [number, number][] = []
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n]
      const curr = pts[i]
      const nxt = pts[(i + 1) % n]
      next.push([
        curr[0] + 0.5 * ((prev[0] + nxt[0]) / 2 - curr[0]),
        curr[1] + 0.5 * ((prev[1] + nxt[1]) / 2 - curr[1]),
      ])
    }
    pts = next
  }
  return pts
}
