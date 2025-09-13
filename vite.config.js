import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isOffline = process.env.VITE_BUILD_MODE === 'offline'
  return {
    base: isOffline ? './' : (mode === 'production' ? '/flomoji/' : './'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: isOffline ? {
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          manualChunks: undefined,
        }
      }
    } : {}
  }
})

