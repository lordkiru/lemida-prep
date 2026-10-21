// The PWA settings, in their own file so a test can check them (see src/pwa.test.js). Used by vite.config.js.
//
// The service worker caches the APP SHELL ONLY: the HTML, scripts, styles, icons and fonts files that are part of the build.
// It has no runtime caching rules at all, so every API call, and above all every response that carries questions or
// answers, goes straight to the network and is never stored by the service worker. (The API also sends Cache-Control:
// no-store, and the client asks for no-store on every request: see src/api.js.)
export const THEME_COLOR = '#070D1F'

export const pwaOptions = {
  registerType: 'autoUpdate',
  includeAssets: ['logo.svg', 'icons/apple-touch-icon.png'],
  manifest: {
    name: 'Lemida Exam Prep',
    short_name: 'Exam Prep',
    description: 'Practice for your SS2 and SS3 exams on your phone.',
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  },
  workbox: {
    // the shell: files produced by the build
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    // a page refresh on any route gets the shell, but never an API address
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    // NO runtime caching: nothing fetched while the app runs (API calls, question data) is ever cached
    runtimeCaching: [],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
  },
}
