export { DEFAULT_TITLE_HUE } from '../lib/theme'

export const DEFAULT_CARD_SIZE = { width: 420, height: 520 } as const

/** 与 .card__titlebar height 保持一致 */
export const CARD_TITLEBAR_HEIGHT = 32

export const DEFAULT_CARD_CONTENT = `# 欢迎使用 MDoCards

这是一张**可编辑**的 Markdown 卡片，支持 Typora 风格实时预览。

## 节点端口

- 列表项默认带 **next** 端口
  - 嵌套列表项也有独立 next 端口
- 右键段落可开启 **prev / next** 端口
- 从 next 拖到 prev 建立连接

> 引用、代码块、公式同样可以作为段落节点。

\`\`\`js
console.log('hello card graph')
\`\`\`

行内公式 $E = mc^2$，块级公式：

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

<u>下划线</u>、~~删除线~~、*斜体*
`
