import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconLogo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="7" width="8" height="14" rx="1.5" />
      <path d="M7 17h4" />
      <circle cx="17" cy="11" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconSave(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}

export function IconFolderOpen(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 7h5l2 2h9v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <path d="M4 9h18" />
    </svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  )
}

export function IconZoom(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  )
}

export function IconHelp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.25a2.75 2.75 0 1 1 4.8 1.85c-.9.78-1.55 1.45-1.55 2.65" />
      <circle cx="12" cy="17.25" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPortIn(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h12" />
      <path d="M12 8l4 4-4 4" />
      <rect x="17" y="9" width="3" height="6" rx="1" />
    </svg>
  )
}

export function IconPortOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="9" width="3" height="6" rx="1" />
      <path d="M8 12h12" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  )
}

export function IconUndo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 7H5v4" />
      <path d="M5 11a7 7 0 1 0 2.05-4.95" />
    </svg>
  )
}

export function IconRedo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 7h4v4" />
      <path d="M19 11a7 7 0 1 1-2.05-4.95" />
    </svg>
  )
}

export function IconSidebar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function IconExport(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function IconZoomIn(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  )
}

export function IconZoomOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35M8 11h6" />
    </svg>
  )
}

export function IconFit(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  )
}

export function IconAlign(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M7 10h10M9 14h6M11 18h2" />
    </svg>
  )
}
