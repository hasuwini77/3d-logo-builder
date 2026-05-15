import { useState } from 'react'
import type { CoinSettings } from './SpinningCoin'

const ENVIRONMENTS = [
  'warehouse',
  'studio',
  'city',
  'night',
  'dawn',
  'sunset',
] as const

const RIM_PRESETS = [
  { color: '#8ecae6', emissive: '#06b6d4', label: 'Cyan' },
  { color: '#e6c88e', emissive: '#d4a506', label: 'Gold' },
  { color: '#e68e8e', emissive: '#d40606', label: 'Red' },
  { color: '#8ee6ae', emissive: '#06d46a', label: 'Green' },
  { color: '#c0c0c0', emissive: '#888888', label: 'Silver' },
]

interface ControlsProps {
  settings: CoinSettings
  onChange: (settings: CoinSettings) => void
  disabled: boolean
}

export default function Controls({ settings, onChange, disabled }: ControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (partial: Partial<CoinSettings>) =>
    onChange({ ...settings, ...partial })

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {/* Environment */}
      <div className="mb-5">
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">
          Environment
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env}
              onClick={() => update({ environment: env })}
              className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
                settings.environment === env
                  ? 'bg-cyan-900/40 border border-cyan-500 text-cyan-400'
                  : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Rim color */}
      <div className="mb-5">
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">
          Rim Color
        </label>
        <div className="flex gap-2 items-center">
          {RIM_PRESETS.map((preset) => (
            <button
              key={preset.color}
              onClick={() =>
                update({ rimColor: preset.color, rimEmissive: preset.emissive })
              }
              title={preset.label}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                settings.rimColor === preset.color
                  ? 'border-cyan-400 scale-110'
                  : 'border-neutral-600'
              }`}
              style={{ background: preset.color }}
            />
          ))}
          <input
            type="color"
            value={settings.rimColor}
            onChange={(e) =>
              update({ rimColor: e.target.value, rimEmissive: e.target.value })
            }
            className="w-8 h-8 rounded-full border-2 border-neutral-600 cursor-pointer bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      {/* Text mode */}
      <div className="mb-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.hasText}
            onChange={(e) => update({ hasText: e.target.checked })}
            className="accent-cyan-500 w-4 h-4"
          />
          <span className="text-sm text-neutral-400">Logo has text</span>
        </label>
        <p className="text-[11px] text-neutral-600 mt-1 ml-6">
          {settings.hasText
            ? 'Text stays readable on both sides'
            : 'Back shows natural mirror, like a real coin'}
        </p>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-neutral-500 text-sm mb-3 hover:text-neutral-300 transition-colors"
      >
        <span
          className="transition-transform text-xs"
          style={{ transform: showAdvanced ? 'rotate(90deg)' : undefined }}
        >
          ▶
        </span>
        Advanced Settings
      </button>

      {/* Advanced panel */}
      {showAdvanced && (
        <div className="border-t border-neutral-800 pt-3 space-y-4">
          <SliderControl
            label="Spin Speed"
            value={settings.spinSpeed}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => update({ spinSpeed: v })}
          />
          <SliderControl
            label="Thickness"
            value={settings.thickness}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => update({ thickness: v })}
          />
          <SliderControl
            label="Emboss Strength"
            value={settings.embossStrength}
            min={0}
            max={3.0}
            step={0.1}
            onChange={(v) => update({ embossStrength: v })}
          />
          <SliderControl
            label="BG Threshold"
            value={settings.bgThreshold}
            min={0}
            max={50}
            step={1}
            onChange={(v) => update({ bgThreshold: v })}
          />
        </div>
      )}
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-500">{label}</span>
        <span className="text-neutral-400 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </div>
  )
}
