export type ThemeMode = 'light' | 'dark'

/** 标题栏：用户只选色相，饱和度/明度由主题固定 */
export interface TitleTone {
  saturation: number
  lightness: number
}

export interface ThemeTokens {
  titleTone: TitleTone
  titleText: string
}

export const THEME_TOKENS: Record<ThemeMode, ThemeTokens> = {
  light: {
    titleTone: { saturation: 42, lightness: 88 },
    titleText: '#2d2d2d',
  },
  dark: {
    titleTone: { saturation: 38, lightness: 30 },
    titleText: '#f0f0f0',
  },
}

export const DEFAULT_TITLE_HUE = 0

export function titleColorFromHue(hue: number, theme: ThemeMode): string {
  const { saturation, lightness } = THEME_TOKENS[theme].titleTone
  return `hsl(${wrapHue(hue)}, ${saturation}%, ${lightness}%)`
}

/** 卡片级端口凹槽色：与标题栏同色相，降低明度 */
export function titlePortGrooveFromHue(
  hue: number,
  theme: ThemeMode,
): { bg: string; edge: string; highlight: string } {
  const { saturation, lightness } = THEME_TOKENS[theme].titleTone
  const h = wrapHue(hue)

  if (theme === 'light') {
    const bg = Math.max(lightness - 24, 52)
    const edge = Math.max(bg - 12, 42)
    const highlight = Math.min(bg + 6, lightness - 4)
    return {
      bg: `hsl(${h}, ${saturation}%, ${bg}%)`,
      edge: `hsl(${h}, ${saturation}%, ${edge}%)`,
      highlight: `hsl(${h}, ${Math.max(saturation - 8, 20)}%, ${highlight}%)`,
    }
  }

  const bg = Math.max(lightness - 12, 14)
  const edge = Math.max(bg - 8, 8)
  const highlight = Math.min(bg + 8, lightness + 4)
  return {
    bg: `hsl(${h}, ${saturation}%, ${bg}%)`,
    edge: `hsl(${h}, ${saturation}%, ${edge}%)`,
    highlight: `hsl(${h}, ${Math.max(saturation - 6, 18)}%, ${highlight}%)`,
  }
}

export function wrapHue(hue: number): number {
  const n = hue % 360
  return n < 0 ? n + 360 : n
}

export function hexToHue(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return DEFAULT_TITLE_HUE
  return rgbToHue(rgb.r, rgb.g, rgb.b)
}

export function hueToPickerHex(hue: number): string {
  const { r, g, b } = hslToRgb(wrapHue(hue), 100, 50)
  return rgbToHex(r, g, b)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(normalized)) return null
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHue(r: number, g: number, b: number): number {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  if (delta === 0) return 0

  let hue = 0
  if (max === rn) hue = ((gn - bn) / delta) % 6
  else if (max === gn) hue = (bn - rn) / delta + 2
  else hue = (rn - gn) / delta + 4

  return wrapHue(Math.round(hue * 60))
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let rn = 0
  let gn = 0
  let bn = 0

  if (h < 60) [rn, gn, bn] = [c, x, 0]
  else if (h < 120) [rn, gn, bn] = [x, c, 0]
  else if (h < 180) [rn, gn, bn] = [0, c, x]
  else if (h < 240) [rn, gn, bn] = [0, x, c]
  else if (h < 300) [rn, gn, bn] = [x, 0, c]
  else [rn, gn, bn] = [c, 0, x]

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** 从旧版 titleColor 或缺失字段归一化色相 */
export function normalizeTitleHue(card: { titleHue?: number; titleColor?: string }): number {
  if (typeof card.titleHue === 'number' && Number.isFinite(card.titleHue)) {
    return wrapHue(card.titleHue)
  }
  if (card.titleColor) return hexToHue(card.titleColor)
  return DEFAULT_TITLE_HUE
}
