import { useState, useRef, useCallback } from 'react'
import SpinningCoin, {
  DEFAULT_SETTINGS,
  type CoinSettings,
  type CoinHandle,
} from './components/SpinningCoin'
import UploadZone from './components/UploadZone'
import Controls from './components/Controls'
import ExportButton from './components/ExportButton'
import CodeExport from './components/CodeExport'

export default function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [settings, setSettings] = useState<CoinSettings>(DEFAULT_SETTINGS)
  const [exporting, setExporting] = useState(false)
  const coinRef = useRef<CoinHandle>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const getCanvas = useCallback(
    () => canvasContainerRef.current?.querySelector('canvas') ?? null,
    []
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🪙</span>
          <span className="font-bold text-lg text-white">3D Logo Builder</span>
        </div>
        <a
          href="https://github.com/hasuwini77/3d-logo-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 text-sm hover:text-neutral-300 transition-colors"
        >
          GitHub ↗
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* 3D Preview */}
        <div
          ref={canvasContainerRef}
          className="flex-1 min-h-[300px] md:min-h-0 bg-neutral-900 relative"
        >
          <SpinningCoin
            imageUrl={imageUrl}
            settings={settings}
            coinRef={coinRef}
          />
          {!imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-5xl mb-3 opacity-30">🪙</div>
                <p className="text-neutral-600 text-sm">
                  Upload a logo to get started
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-neutral-800 p-5 overflow-y-auto">
          <UploadZone
            onUpload={setImageUrl}
            hasImage={!!imageUrl}
          />
          <Controls
            settings={settings}
            onChange={setSettings}
            disabled={!imageUrl || exporting}
          />
          <ExportButton
            canvasGetter={getCanvas}
            coinRef={coinRef}
            disabled={!imageUrl}
            onExportStateChange={setExporting}
          />
          <CodeExport
            imageUrl={imageUrl}
            settings={settings}
            disabled={exporting}
          />
        </div>
      </main>
    </div>
  )
}
