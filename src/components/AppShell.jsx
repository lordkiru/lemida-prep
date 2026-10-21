import { NavLink, Outlet } from 'react-router-dom'
import Icon from './icons'
import ThemeToggle from './ThemeToggle'
import { NAV_ITEMS } from '../navItems'

// The layout around every page.
//   Phone (under 1024px): a slim top bar with the logo, and a tab bar fixed to the bottom.
//   PC (1024px and up):   a sidebar on the left with the logo, the same five items and the theme switch.
export default function AppShell() {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="absolute left-2 top-2 z-50 -translate-y-16 rounded-lg bg-button px-3 py-2 text-sm font-bold text-button-fg focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* PC: sidebar */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-60 flex-col p-4 lg:flex" aria-label="Sidebar">
        <div className="mb-6 flex items-center gap-3 px-2 pt-1">
          <img src="/logo.svg" alt="" width="40" height="40" className="h-10 w-10" />
          <div className="leading-tight">
            <div className="text-base font-extrabold">Exam Prep</div>
            <div className="text-xs text-muted">by Lemida</div>
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl border-l-4 px-3 text-sm ${
                  isActive ? 'border-accent bg-black/5 font-bold text-accent dark:bg-white/10' : 'border-transparent font-medium text-fg hover:bg-black/5 dark:hover:bg-white/10'
                }`
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-1 pb-1">
          <ThemeToggle />
        </div>
      </aside>

      {/* Phone: top bar */}
      <header className="glass sticky top-2 z-30 mx-2 mt-2 flex items-center justify-between !rounded-2xl px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" width="32" height="32" className="h-8 w-8" />
          <span className="text-base font-extrabold">Exam Prep</span>
        </div>
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pb-28 pt-5 lg:ml-64 lg:max-w-4xl lg:px-8 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      {/* Phone: bottom tab bar */}
      <nav aria-label="Main" className="glass fixed inset-x-2 bottom-2 z-30 !rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="m-0 flex list-none p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-t-4 text-[0.7rem] ${
                    isActive ? 'border-accent font-bold text-accent' : 'border-transparent font-medium text-muted'
                  }`
                }
              >
                <Icon name={item.icon} className="h-6 w-6" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
