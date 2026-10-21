// Light / Dark / System theme for Lemida Exam Prep (the same approach as Content Studio).
//
// The choice is remembered in localStorage under THEME_KEY. index.html runs a tiny inline script BEFORE the first paint that
// reads the same key and puts the `dark` class on <html>, so there is no flash of the wrong theme. Keep that script and these
// functions in step. "System" (the default) follows the device setting.
export const THEME_KEY = 'prep-theme'
export const THEMES = ['light', 'dark', 'system']
export const DEFAULT_THEME = 'system'

// Storage can throw (blocked storage, private windows), so both calls are wrapped: the app still works, the choice just
// isn't remembered.
export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return THEMES.includes(value) ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage unavailable: the choice applies for this visit only
  }
}

export const isDark = (theme, systemPrefersDark) => theme === 'dark' || (theme === 'system' && Boolean(systemPrefersDark))

export const systemDarkQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null)

// Puts the theme on the page: the `dark` class (for the tokens and Tailwind) and color-scheme (so scrollbars and form controls
// match). Returns whether the page is now dark.
export function applyTheme(theme) {
  const query = systemDarkQuery()
  const dark = isDark(theme, query ? query.matches : false)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  return dark
}
