import { useState, useCallback } from 'react'
import { generateComponentCode } from '../utils/codegen'
import type { CoinSettings } from './SpinningCoin'

interface CodeExportProps {
  imageUrl: string | null
  settings: CoinSettings
  disabled: boolean
}

export default function CodeExport({ imageUrl, settings, disabled }: CodeExportProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!imageUrl) return
    const code = generateComponentCode(imageUrl, settings)
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [imageUrl, settings])

  return (
    <div className="mt-3">
      <button
        onClick={handleCopy}
        disabled={disabled || !imageUrl}
        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
          disabled || !imageUrl
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : copied
            ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
            : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-500 hover:text-white'
        }`}
      >
        {copied ? '✓ Copied to clipboard!' : '📋 Copy React Component'}
      </button>
      <p className="text-center mt-1 text-[11px] text-neutral-600">
        Self-contained .tsx · Settings baked in
      </p>
    </div>
  )
}
