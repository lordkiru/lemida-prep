import { useEffect, useState } from 'react'
import { applyTheme, readStoredTheme, storeTheme, systemDarkQuery } from '../theme'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

// Light / Dark / System (System follows the device). The chosen button is shown by its look AND by aria-pressed.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(readStoredTheme)

  // Apply on mount and on every change; while "System" is chosen, follow the device as its setting changes.
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return undefined
    const query = systemDarkQuery()
    if (!query) return undefined
    const onChange = () => applyTheme('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  const choose = (value) => {
    setTheme(value)
    storeTheme(value)
  }

  return (
    <div role="group" aria-label="Colour theme" className="glass inline-flex overflow-hidden !rounded-xl p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => choose(o.value)}
          className={`min-h-9 rounded-[0.6rem] px-3 text-xs font-semibold ${
            theme === o.value ? 'bg-button text-button-fg' : 'text-fg hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
