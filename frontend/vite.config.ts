import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
  server: {
    host: true,
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' },
  },
})
