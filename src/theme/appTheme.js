import { useEffect, useState } from 'react'

const STORAGE_KEY = 'fizzia_theme'
const THEME_EVENT = 'fizzia-theme-change'

export const appThemes = {
  fizzia: {
    key: 'fizzia',
    label: 'Fizzia',
    swatch: 'bg-fizzia-500',
    activeText: 'text-fizzia-400',
    activeBg: 'bg-fizzia-500/10',
    activeButton: 'bg-fizzia-500 text-white',
    badgeBg: 'bg-fizzia-500/20',
    badgeText: 'text-fizzia-400',
    avatarBorder: 'border-fizzia-500/30',
    text: 'text-fizzia-400',
    hoverText: 'hover:text-fizzia-300',
    focusBorder: 'focus:border-fizzia-500',
    bg: 'bg-fizzia-500',
    hoverBg: 'hover:bg-fizzia-400',
    border: 'border-fizzia-500/40 hover:border-fizzia-500',
    borderStrong: 'border-fizzia-500',
    borderSoft: 'border-fizzia-500/60',
    ring: 'ring-fizzia-500/30',
    shadow: 'shadow-fizzia-500/10',
    notice: 'bg-fizzia-500/10 border-fizzia-500/30 text-fizzia-400',
    glow: 'bg-fizzia-500/10',
    glowSoft: 'bg-fizzia-600/5',
  },
  rose: {
    key: 'rose',
    label: 'Rosa',
    swatch: 'bg-rose-500',
    activeText: 'text-rose-400',
    activeBg: 'bg-rose-500/10',
    activeButton: 'bg-rose-500 text-white',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    avatarBorder: 'border-rose-500/30',
    text: 'text-rose-400',
    hoverText: 'hover:text-rose-300',
    focusBorder: 'focus:border-rose-500',
    bg: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-400',
    border: 'border-rose-500/40 hover:border-rose-500',
    borderStrong: 'border-rose-500',
    borderSoft: 'border-rose-500/60',
    ring: 'ring-rose-500/30',
    shadow: 'shadow-rose-500/10',
    notice: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    glow: 'bg-rose-500/10',
    glowSoft: 'bg-rose-600/5',
  },
  purple: {
    key: 'purple',
    label: 'Violeta',
    swatch: 'bg-purple-500',
    activeText: 'text-purple-400',
    activeBg: 'bg-purple-500/10',
    activeButton: 'bg-purple-500 text-white',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-400',
    avatarBorder: 'border-purple-500/30',
    text: 'text-purple-400',
    hoverText: 'hover:text-purple-300',
    focusBorder: 'focus:border-purple-500',
    bg: 'bg-purple-500',
    hoverBg: 'hover:bg-purple-400',
    border: 'border-purple-500/40 hover:border-purple-500',
    borderStrong: 'border-purple-500',
    borderSoft: 'border-purple-500/60',
    ring: 'ring-purple-500/30',
    shadow: 'shadow-purple-500/10',
    notice: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    glow: 'bg-purple-500/10',
    glowSoft: 'bg-purple-600/5',
  },
  blue: {
    key: 'blue',
    label: 'Azul',
    swatch: 'bg-blue-500',
    activeText: 'text-blue-400',
    activeBg: 'bg-blue-500/10',
    activeButton: 'bg-blue-500 text-white',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
    avatarBorder: 'border-blue-500/30',
    text: 'text-blue-400',
    hoverText: 'hover:text-blue-300',
    focusBorder: 'focus:border-blue-500',
    bg: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-400',
    border: 'border-blue-500/40 hover:border-blue-500',
    borderStrong: 'border-blue-500',
    borderSoft: 'border-blue-500/60',
    ring: 'ring-blue-500/30',
    shadow: 'shadow-blue-500/10',
    notice: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    glow: 'bg-blue-500/10',
    glowSoft: 'bg-blue-600/5',
  },
  amber: {
    key: 'amber',
    label: 'Ambar',
    swatch: 'bg-amber-500',
    activeText: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    activeButton: 'bg-amber-500 text-black',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    avatarBorder: 'border-amber-500/30',
    text: 'text-amber-300',
    hoverText: 'hover:text-amber-200',
    focusBorder: 'focus:border-amber-500',
    bg: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-400',
    border: 'border-amber-500/40 hover:border-amber-500',
    borderStrong: 'border-amber-500',
    borderSoft: 'border-amber-500/60',
    ring: 'ring-amber-500/30',
    shadow: 'shadow-amber-500/10',
    notice: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    glow: 'bg-amber-500/10',
    glowSoft: 'bg-amber-600/5',
  },
}

export const appThemeOptions = Object.values(appThemes)

export function getStoredTheme(defaultTheme = 'fizzia') {
  if (typeof window === 'undefined') return defaultTheme
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return appThemes[stored] ? stored : defaultTheme
}

export function setStoredTheme(theme) {
  if (!appThemes[theme]) return
  window.localStorage.setItem(STORAGE_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }))
}

export function useAppTheme(defaultTheme = 'fizzia') {
  const [theme, setTheme] = useState(() => getStoredTheme(defaultTheme))

  useEffect(() => {
    function handleThemeChange(event) {
      setTheme(appThemes[event.detail] ? event.detail : getStoredTheme(defaultTheme))
    }
    window.addEventListener(THEME_EVENT, handleThemeChange)
    window.addEventListener('storage', handleThemeChange)
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [defaultTheme])

  const updateTheme = (nextTheme) => {
    if (!appThemes[nextTheme]) return
    setStoredTheme(nextTheme)
    setTheme(nextTheme)
  }

  return {
    theme,
    palette: appThemes[theme] || appThemes[defaultTheme] || appThemes.fizzia,
    setTheme: updateTheme,
  }
}
