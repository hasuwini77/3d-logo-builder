export function extractPerimeter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 0
): [number, number][] {
  // Build binary grid: 1 = opaque, 0 = transparent
  const grid = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    grid[i] = data[i * 4 + 3] > alphaThreshold ? 1 : 0
  }

  // Find the longest contour using marching squares
  const contour = marchingSquares(grid, width, height)
  if (contour.length < 3) {
    // Fallback to simple bounding box if marching squares fails
    return fallbackPerimeter(grid, width, height)
  }

  // Simplify with Douglas-Peucker to reduce vertex count
  const simplified = douglasPeucker(contour, Math.max(width, height) * 0.005)

  // Target ~800 vertices max
  const step = Math.max(1, Math.floor(simplified.length / 800))
  const sampled = simplified
    .filter((_, i) => i % step === 0)
    .map(
      ([px, py]) =>
        [px / width - 0.5, 0.5 - py / height] as [number, number]
    )

  return smoothOutline(sampled, 3)
}

function marchingSquares(
  grid: Uint8Array,
  width: number,
  height: number
): [number, number][] {
  // Sample the grid at (x, y) with boundary = 0
  const sample = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height ? grid[y * width + x] : 0

  // Find starting pixel: first opaque pixel from top-left
  let startX = -1
  let startY = -1
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (sample(x, y) === 1) {
        startX = x
        startY = y
        break outer
      }
    }
  }
  if (startX === -1) return []

  const contour: [number, number][] = []
  // Start marching from the cell above-left of the first opaque pixel
  let cx = startX - 1
  let cy = startY - 1
  let prevDir = 0 // 0=right, 1=down, 2=left, 3=up
  const maxSteps = (width + height) * 4

  for (let step = 0; step < maxSteps; step++) {
    // Compute the 2x2 cell configuration
    // Cell corners: top-left=(cx,cy), top-right=(cx+1,cy),
    //               bottom-left=(cx,cy+1), bottom-right=(cx+1,cy+1)
    const tl = sample(cx, cy)
    const tr = sample(cx + 1, cy)
    const bl = sample(cx, cy + 1)
    const br = sample(cx + 1, cy + 1)
    const cellCase = (tl << 3) | (tr << 2) | (br << 1) | bl

    // Record the contour point (center of cell edge where boundary crosses)
    contour.push([cx + 1, cy + 1])

    // Determine next direction based on cell case
    // Using clockwise tracing convention
    let nextDir: number
    switch (cellCase) {
      case 1:  nextDir = 0; break  // right
      case 2:  nextDir = 1; break  // down
      case 3:  nextDir = 0; break  // right
      case 4:  nextDir = 3; break  // up
      case 5:  nextDir = 3; break  // up (saddle: keep prev)
      case 6:  // saddle point - use previous direction to disambiguate
        nextDir = prevDir === 0 ? 1 : 3
        break
      case 7:  nextDir = 0; break  // right
      case 8:  nextDir = 2; break  // left
      case 9:  // saddle point
        nextDir = prevDir === 1 ? 0 : 2
        break
      case 10: nextDir = 1; break  // down
      case 11: nextDir = 1; break  // down
      case 12: nextDir = 2; break  // left
      case 13: nextDir = 2; break  // left
      case 14: nextDir = 3; break  // up
      default: nextDir = prevDir; break // 0 or 15: no boundary
    }

    // Move to next cell
    switch (nextDir) {
      case 0: cx++; break  // right
      case 1: cy++; break  // down
      case 2: cx--; break  // left
      case 3: cy--; break  // up
    }
    prevDir = nextDir

    // Check if we've returned to start
    if (step > 0 && cx === startX - 1 && cy === startY - 1) break
  }

  return contour
}

function douglasPeucker(
  points: [number, number][],
  epsilon: number
): [number, number][] {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIdx = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon)
    const right = douglasPeucker(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }

  return [start, end]
}

function perpendicularDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ex = point[0] - start[0]
    const ey = point[1] - start[1]
    return Math.sqrt(ex * ex + ey * ey)
  }
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / Math.sqrt(lenSq)
}

function fallbackPerimeter(
  grid: Uint8Array,
  width: number,
  height: number
): [number, number][] {
  // Simple left-right scan as fallback
  const rightEdge: [number, number][] = []
  const leftEdge: [number, number][] = []
  for (let y = 0; y < height; y++) {
    let left = -1
    let right = -1
    for (let x = 0; x < width; x++) {
      if (grid[y * width + x]) {
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
  return raw
    .filter((_, i) => i % step === 0)
    .map(([px, py]) => [px / width - 0.5, 0.5 - py / height] as [number, number])
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
