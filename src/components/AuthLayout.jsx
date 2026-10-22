import { Outlet } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

// The frame around the pages you see before you are inside the app (sign up, sign in, forgot password, first-time setup):
// the logo, a centred card, no menu. `wide` gives the setup form more room.
export default function AuthLayout({ wide = false }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="absolute left-2 top-2 z-50 -translate-y-16 rounded-lg bg-button px-3 py-2 text-sm font-bold text-button-fg focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" width="36" height="36" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="text-base font-extrabold">Exam Prep</div>
            <div className="text-xs text-muted">by Lemida</div>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <main id="main" className={`mx-auto px-4 pb-10 pt-6 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <Outlet />
      </main>
    </div>
  )
}
