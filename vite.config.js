import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './pwa.config.js'

// Port 5175 so it can run next to SchoolManager (5173) and Content Studio (5174) while developing.
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
  server: { port: 5175 },
})
