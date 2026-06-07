import { CARD_PRESETS } from '../lib/cardPresets'
import './EmptyCanvasGuide.css'

interface EmptyCanvasGuideProps {
  onAddBlank: () => void
  onAddPreset: (presetId: string) => void
}

export function EmptyCanvasGuide({ onAddBlank, onAddPreset }: EmptyCanvasGuideProps) {
  return (
    <div className="empty-canvas">
      <div className="empty-canvas__card">
        <h2>开始创建你的卡片工作区</h2>
        <p>从空白卡片或模板开始，拖拽连线、框选组合，构建可视化知识图谱。</p>
        <button type="button" className="empty-canvas__primary" onClick={onAddBlank}>
          新建空白卡片
        </button>
        <div className="empty-canvas__presets">
          {CARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="empty-canvas__preset"
              onClick={() => onAddPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
