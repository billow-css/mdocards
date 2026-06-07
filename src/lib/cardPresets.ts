import type { Card } from '../types'
import { DEFAULT_CARD_SIZE } from '../types/constants'

export interface CardPreset {
  id: string
  label: string
  description: string
  titleHue: number
  title: string
  content: string
  size?: { width: number; height: number }
}

export const CARD_PRESETS: CardPreset[] = [
  {
    id: 'blank',
    label: '空白卡片',
    description: '仅标题，正文为空',
    titleHue: 0,
    title: '',
    content: '',
    size: { width: 320, height: 200 },
  },
  {
    id: 'plain',
    label: '纯文本',
    description: '单段落，适合简短说明',
    titleHue: 220,
    title: '纯文本',
    content: '在此输入内容…',
    size: { width: 360, height: 220 },
  },
  {
    id: 'notice',
    label: '通知单',
    description: '标题、时间、正文、落款结构',
    titleHue: 38,
    title: '通知',
    content: `## 通知标题

**时间：** 2026年__月__日

**正文：**

请各部门知悉并按要求执行。

---

**落款：** ___________`,
    size: { width: 400, height: 420 },
  },
  {
    id: 'flow',
    label: '流程节点',
    description: '步骤列表，默认便于串联',
    titleHue: 200,
    title: '流程节点',
    content: `## 节点说明

简要描述本步骤要完成的任务。

1. 输入条件
2. 处理动作
3. 输出结果`,
    size: { width: 380, height: 360 },
  },
  {
    id: 'document',
    label: '文档',
    description: '多段落 Markdown 文档',
    titleHue: 145,
    title: '文档',
    content: `# 文档标题

开篇段落。

## 第一节

- 要点一
- 要点二

## 第二节

补充说明。`,
    size: { width: 420, height: 480 },
  },
]

const presetMap = new Map(CARD_PRESETS.map((preset) => [preset.id, preset]))

export function getCardPreset(id: string): CardPreset | undefined {
  return presetMap.get(id)
}

export function cardFromPreset(presetId: string, patch: Partial<Card> & { id: string }): Card | null {
  const preset = getCardPreset(presetId)
  if (!preset) return null

  return {
    title: preset.title,
    titleHue: preset.titleHue,
    content: preset.content,
    position: { x: 120, y: 80 },
    size: preset.size ?? { ...DEFAULT_CARD_SIZE },
    anchorOverrides: {},
    ...patch,
  }
}
