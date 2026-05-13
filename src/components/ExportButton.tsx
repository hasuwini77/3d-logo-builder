import { useState, useCallback } from 'react'
import { exportAnimatedWebP, type ExportProgress } from '../utils/export'
import type { CoinHandle } from './SpinningCoin'

interface ExportButtonProps {
  canvasGetter: () => HTMLCanvasElement | null
  coinRef: React.RefObject<CoinHandle | null>
  disabled: boolean
  onExportStateChange: (exporting: boolean) => void
}

export default function ExportButton({
  canvasGetter,
  coinRef,
  disabled,
  onExportStateChange,
}: ExportButtonProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const exporting = progress !== null && progress.phase !== 'done' && progress.phase !== 'error'

  const handleExport = useCallback(async () => {
    const canvas = canvasGetter()
    if (!canvas) return

    onExportStateChange(true)

    const EXPORT_SPEED = (2 * Math.PI) / 9
    coinRef.current?.resetRotation()
    coinRef.current?.setExportMode(true, EXPORT_SPEED)

    await exportAnimatedWebP(canvas, setProgress)

    coinRef.current?.setExportMode(false)
    onExportStateChange(false)

    setTimeout(() => setProgress(null), 3000)
  }, [canvasGetter, coinRef, onExportStateChange])

  return (
    <div className="mt-5">
      <button
        onClick={handleExport}
        disabled={disabled || exporting}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          disabled || exporting
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white hover:from-cyan-500 hover:to-sky-500 active:scale-[0.98]'
        }`}
      >
        {exporting ? progress?.message : '⬇ Export Animated WebP'}
      </button>

      {exporting && (
        <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${(progress?.progress ?? 0) * 100}%` }}
          />
        </div>
      )}

      {progress?.phase === 'done' && (
        <p className="text-xs text-emerald-400 mt-2 text-center">
          Downloaded successfully!
        </p>
      )}

      {progress?.phase === 'error' && (
        <p className="text-xs text-red-400 mt-2 text-center">
          {progress.message}
        </p>
      )}

      <p className="text-center mt-1.5 text-[11px] text-neutral-600">
        9-second loop · 400×400px · WebP
      </p>
    </div>
  )
}
