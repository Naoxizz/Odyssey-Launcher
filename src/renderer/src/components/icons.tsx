import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="miter"
      strokeLinecap="butt"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const IconPlay = () => (
  <Icon>
    <path d="M6 4L20 12L6 20Z" />
  </Icon>
)

export const IconProfil = () => (
  <Icon>
    <path d="M12 3L15 6L12 9L9 6Z" />
    <path d="M8 20L10 12H14L16 20Z" />
  </Icon>
)

export const IconReglages = () => (
  <Icon>
    <path d="M3 7H21M3 12H21M3 17H21" />
    <path d="M8 4V10M16 9V15M10 14V20" />
  </Icon>
)

export const IconBiomes = () => (
  <Icon>
    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5Z" />
    <path d="M4 7.5L12 12L20 7.5M12 12V21" />
  </Icon>
)

export function Racine({ active }: { active: boolean }) {
  return (
    <svg
      className={active ? 'racine is-active' : 'racine'}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2V8L6 14L4 22M6 14L9 22M12 8L18 14L15 22M18 14L20 22" />
    </svg>
  )
}
