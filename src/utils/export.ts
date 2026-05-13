import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance
  const ffmpeg = new FFmpeg()
  await ffmpeg.load()
  ffmpegInstance = ffmpeg
  return ffmpeg
}

export type ExportProgress = {
  phase: 'recording' | 'converting' | 'done' | 'error'
  progress: number
  message: string
}

export async function exportAnimatedWebP(
  canvas: HTMLCanvasElement,
  onProgress: (p: ExportProgress) => void
): Promise<void> {
  const TOTAL_FRAMES = 270
  const FPS = 30

  onProgress({ phase: 'recording', progress: 0, message: 'Starting recording...' })

  try {
    const stream = canvas.captureStream(FPS)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const recordingDone = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
      recorder.onerror = (e) => reject(e)
    })

    recorder.start()

    const duration = (TOTAL_FRAMES / FPS) * 1000
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(elapsed / duration, 1)
      onProgress({
        phase: 'recording',
        progress: pct * 0.5,
        message: `Recording... ${Math.round(pct * 100)}%`,
      })
    }, 200)

    await new Promise((r) => setTimeout(r, duration + 200))
    clearInterval(progressInterval)
    recorder.stop()

    const webmBlob = await recordingDone
    onProgress({ phase: 'converting', progress: 0.5, message: 'Loading converter...' })

    let downloadBlob: Blob
    let filename: string

    try {
      const ffmpeg = await getFFmpeg()
      onProgress({ phase: 'converting', progress: 0.6, message: 'Converting to WebP...' })

      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob))
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', 'scale=400:400',
        '-r', '30',
        '-vsync', 'cfr',
        '-loop', '0',
        'output.webp',
      ])

      const outputData = await ffmpeg.readFile('output.webp')
      const bytes = outputData instanceof Uint8Array ? new Uint8Array(outputData) : new TextEncoder().encode(outputData as string)
      downloadBlob = new Blob([bytes], { type: 'image/webp' })
      filename = 'logo-3d.webp'
      await ffmpeg.deleteFile('input.webm')
      await ffmpeg.deleteFile('output.webp')
    } catch {
      downloadBlob = webmBlob
      filename = 'logo-3d.webm'
    }

    onProgress({ phase: 'converting', progress: 0.9, message: 'Preparing download...' })

    const url = URL.createObjectURL(downloadBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    onProgress({ phase: 'done', progress: 1, message: 'Done!' })
  } catch (err) {
    onProgress({
      phase: 'error',
      progress: 0,
      message: err instanceof Error ? err.message : 'Export failed',
    })
  }
}
