import { useEffect, useRef, useState } from 'react'
import type { ThemeMode } from '../lib/theme'
import type { AlignMode } from '../lib/align'
import { useEditorStore } from '../store/useEditorStore'
import {
  IconAlign,
  IconExport,
  IconFit,
  IconFolderOpen,
  IconHelp,
  IconLogo,
  IconMoon,
  IconPlus,
  IconPortIn,
  IconPortOut,
  IconRedo,
  IconSave,
  IconSearch,
  IconSidebar,
  IconSun,
  IconTrash,
  IconUndo,
  IconZoom,
  IconZoomIn,
  IconZoomOut,
} from './icons/ToolbarIcons'
import { AboutModal } from './AboutModal'
import { APP_NAME } from '../lib/appInfo'
import { ToolbarIconButton } from './ToolbarIconButton'
import './EditorToolbar.css'

interface EditorToolbarProps {
  theme: ThemeMode
  zoom: number
  containerWidth: number
  containerHeight: number
  documentName: string
  onAddCard: () => void
  onSave: () => void
  onOpen: () => void
  onClearCanvas: () => void
  onToggleTheme: () => void
  onExportMarkdown: () => void
  onExportPng: () => void
  onExportHtml: () => void
}

const ALIGN_OPTIONS: { mode: AlignMode; label: string }[] = [
  { mode: 'left', label: '左对齐' },
  { mode: 'center-h', label: '水平居中' },
  { mode: 'right', label: '右对齐' },
  { mode: 'top', label: '顶对齐' },
  { mode: 'center-v', label: '垂直居中' },
  { mode: 'bottom', label: '底对齐' },
  { mode: 'distribute-h', label: '水平分布' },
  { mode: 'distribute-v', label: '垂直分布' },
]

export function EditorToolbar({
  theme,
  zoom,
  containerWidth,
  containerHeight,
  documentName,
  onAddCard,
  onSave,
  onOpen,
  onClearCanvas,
  onToggleTheme,
  onExportMarkdown,
  onExportPng,
  onExportHtml,
}: EditorToolbarProps) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const toggleShortcuts = useEditorStore((s) => s.toggleShortcuts)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const zoomReset = useEditorStore((s) => s.zoomReset)
  const zoomToFit = useEditorStore((s) => s.zoomToFit)
  const alignSelectedCards = useEditorStore((s) => s.alignSelectedCards)
  const selectedCount = useEditorStore((s) => s.selectedCardIds.length)
  const [exportOpen, setExportOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) {
        setExportOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [exportOpen])

  return (
    <>
    <header className="editor-toolbar">
      <div className="editor-toolbar__brand">
        <button
          type="button"
          className="editor-toolbar__logo-btn"
          onClick={() => setAboutOpen(true)}
          title={`关于 ${APP_NAME}`}
          aria-label={`关于 ${APP_NAME}`}
        >
          <span className="editor-toolbar__logo" aria-hidden>
            <IconLogo />
          </span>
        </button>
        <div className="editor-toolbar__titles">
          <span className="editor-toolbar__name">{APP_NAME}</span>
          <span className="editor-toolbar__tagline" title={documentName}>
            {documentName}
          </span>
        </div>
      </div>

      <span className="editor-toolbar__divider" aria-hidden />

      <div className="editor-toolbar__group">
        <ToolbarIconButton icon={<IconUndo />} label="撤销" onClick={undo} disabled={!canUndo()} />
        <ToolbarIconButton icon={<IconRedo />} label="重做" onClick={redo} disabled={!canRedo()} />
      </div>

      <span className="editor-toolbar__divider" aria-hidden />

      <div className="editor-toolbar__group">
        <ToolbarIconButton icon={<IconPlus />} label="新建卡片" variant="primary" onClick={onAddCard} />
        <ToolbarIconButton icon={<IconSidebar />} label="大纲侧栏" onClick={toggleSidebar} />
        <ToolbarIconButton icon={<IconSearch />} label="搜索卡片" onClick={() => setSearchOpen(true)} />
      </div>

      <span className="editor-toolbar__divider" aria-hidden />

      <div className="editor-toolbar__group">
        <ToolbarIconButton icon={<IconSave />} label="保存" onClick={onSave} />
        <ToolbarIconButton icon={<IconFolderOpen />} label="打开" onClick={onOpen} />
        <div
          ref={exportRef}
          className={`editor-toolbar__menu-wrap ${exportOpen ? 'editor-toolbar__menu-wrap--open' : ''}`}
        >
          <ToolbarIconButton
            icon={<IconExport />}
            label="导出"
            onClick={() => setExportOpen((open) => !open)}
          />
          {exportOpen && (
            <div className="editor-toolbar__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onExportMarkdown()
                  setExportOpen(false)
                }}
              >
                Markdown 合集
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onExportPng()
                  setExportOpen(false)
                }}
              >
                PNG 画布
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onExportHtml()
                  setExportOpen(false)
                }}
              >
                HTML 静态页
              </button>
            </div>
          )}
        </div>
        <ToolbarIconButton icon={<IconTrash />} label="清空画布" variant="danger" onClick={onClearCanvas} />
      </div>

      <span className="editor-toolbar__divider" aria-hidden />

      <div className="editor-toolbar__group">
        <ToolbarIconButton
          icon={<IconAlign />}
          label="对齐（需多选）"
          onClick={() => alignSelectedCards('left')}
          disabled={selectedCount < 2}
        />
        <select
          className="editor-toolbar__align-select"
          defaultValue=""
          disabled={selectedCount < 2}
          onChange={(e) => {
            const mode = e.target.value as AlignMode
            if (mode) alignSelectedCards(mode)
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            对齐
          </option>
          {ALIGN_OPTIONS.map((item) => (
            <option key={item.mode} value={item.mode}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-toolbar__spacer" />

      <div className="editor-toolbar__group editor-toolbar__ports">
        <span className="editor-toolbar__hint-icon" title="prev 端口：点击接入上游">
          <IconPortIn />
        </span>
        <span className="editor-toolbar__hint-icon" title="next 端口：点击拉出下游">
          <IconPortOut />
        </span>
      </div>

      <span className="editor-toolbar__divider" aria-hidden />

      <div className="editor-toolbar__status">
        <ToolbarIconButton
          icon={<IconZoomOut />}
          label="缩小"
          onClick={() => zoomOut(containerWidth, containerHeight)}
        />
        <div className="editor-toolbar__zoom" title="当前缩放">
          <IconZoom />
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <ToolbarIconButton
          icon={<IconZoomIn />}
          label="放大"
          onClick={() => zoomIn(containerWidth, containerHeight)}
        />
        <ToolbarIconButton
          icon={<IconFit />}
          label="适应画布"
          onClick={() => zoomToFit(containerWidth, containerHeight)}
        />
        <button
          type="button"
          className="editor-toolbar__zoom-reset"
          onClick={() => zoomReset(containerWidth, containerHeight)}
          title="100% 缩放"
        >
          100%
        </button>
        <ToolbarIconButton
          icon={theme === 'light' ? <IconMoon /> : <IconSun />}
          label={theme === 'light' ? '切换为暗色主题' : '切换为亮色主题'}
          onClick={onToggleTheme}
        />
        <ToolbarIconButton icon={<IconHelp />} label="快捷键帮助" onClick={toggleShortcuts} />
      </div>
    </header>
    {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  )
}
