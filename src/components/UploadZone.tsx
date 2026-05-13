import { useCallback, useRef, useState } from 'react'

interface UploadZoneProps {
  onUpload: (dataUrl: string) => void
  hasImage: boolean
}

const MAX_SIZE = 5 * 1024 * 1024

export default function UploadZone({ onUpload, hasImage }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    (file: File) => {
      setError(null)
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, or SVG)')
        return
      }
      if (file.size > MAX_SIZE) {
        setError('File too large (max 5MB)')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onload = () => onUpload(dataUrl)
        img.onerror = () => setError('Failed to load image')
        img.src = dataUrl
      }
      reader.onerror = () => setError('Failed to read file')
      reader.readAsDataURL(file)
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  return (
    <div className="mb-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-cyan-400 bg-cyan-400/5'
            : 'border-neutral-700 hover:border-neutral-500'
        }`}
      >
        <div className="text-2xl mb-2">{hasImage ? '🔄' : '📁'}</div>
        <div className="text-sm text-neutral-400">
          {hasImage ? 'Drop a new logo to replace' : 'Drop your logo here'}
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          PNG, JPG, SVG · Max 5MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  )
}
