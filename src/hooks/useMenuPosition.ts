import { useLayoutEffect, type RefObject } from 'react'

const VIEWPORT_PAD = 8
const SUBMENU_MIN_WIDTH = 200

export function useMenuPosition(
  ref: RefObject<HTMLElement | null>,
  x: number,
  y: number,
  enabled = true,
) {
  useLayoutEffect(() => {
    if (!enabled) return
    const menu = ref.current
    if (!menu) return

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.style.visibility = 'hidden'

    const clamp = () => {
      const rect = menu.getBoundingClientRect()
      let left = x
      let top = y

      if (rect.right > window.innerWidth - VIEWPORT_PAD) {
        left = Math.max(VIEWPORT_PAD, window.innerWidth - VIEWPORT_PAD - rect.width)
      }
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD

      if (rect.bottom > window.innerHeight - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, window.innerHeight - VIEWPORT_PAD - rect.height)
      }
      if (top < VIEWPORT_PAD) top = VIEWPORT_PAD

      menu.style.left = `${left}px`
      menu.style.top = `${top}px`
      menu.style.visibility = 'visible'

      const finalRect = menu.getBoundingClientRect()
      const flipSubmenus =
        finalRect.right + SUBMENU_MIN_WIDTH > window.innerWidth - VIEWPORT_PAD

      menu.querySelectorAll('.context-menu__submenu-wrap').forEach((wrap) => {
        wrap.classList.toggle('context-menu__submenu-wrap--flip', flipSubmenus)
      })
    }

    clamp()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [enabled, x, y])
}
