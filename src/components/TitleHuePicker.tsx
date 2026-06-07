import { useEditorStore } from '../store/useEditorStore'
import { hexToHue, hueToPickerHex, titleColorFromHue, wrapHue } from '../lib/theme'

interface TitleHuePickerProps {
  hue: number
  onChange: (hue: number) => void
}

export function TitleHuePicker({ hue, onChange }: TitleHuePickerProps) {
  const theme = useEditorStore((s) => s.theme)
  const preview = titleColorFromHue(hue, theme)

  return (
    <div
      className="title-hue-picker"
      title="标题色调（明度由主题统一）"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="title-hue-picker__preview" style={{ backgroundColor: preview }} />
      <input
        type="range"
        className="title-hue-picker__slider"
        min={0}
        max={360}
        value={wrapHue(hue)}
        onChange={(e) => onChange(wrapHue(Number(e.target.value)))}
      />
      <label className="title-hue-picker__wheel" title="色盘选色调">
        <input
          type="color"
          value={hueToPickerHex(hue)}
          onChange={(e) => onChange(hexToHue(e.target.value))}
        />
      </label>
    </div>
  )
}
