import { CARD_PRESETS } from '../lib/cardPresets'
import { titleColorFromHue } from '../lib/theme'
import { useEditorStore } from '../store/useEditorStore'
import { ContextMenuItem } from './ContextMenu'

interface PresetMenuItemsProps {
  onSelect: (presetId: string) => void
}

export function PresetMenuItems({ onSelect }: PresetMenuItemsProps) {
  const theme = useEditorStore((s) => s.theme)

  return (
    <>
      {CARD_PRESETS.map((preset) => (
        <ContextMenuItem
          key={preset.id}
          label={preset.label}
          hint={preset.description}
          leading={
            <span
              className="context-menu__preset-swatch"
              style={{ backgroundColor: titleColorFromHue(preset.titleHue, theme) }}
            />
          }
          onClick={(e) => {
            e.stopPropagation()
            onSelect(preset.id)
          }}
        />
      ))}
    </>
  )
}
