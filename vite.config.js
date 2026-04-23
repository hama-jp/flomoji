import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const MANUAL_CHUNK_GROUPS = [
  {
    name: 'vendor-react',
    packages: ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'],
  },
  {
    name: 'vendor-flow',
    packages: ['@xyflow/react'],
  },
  {
    name: 'vendor-radix',
    packages: ['@radix-ui/'],
  },
  {
    name: 'vendor-ui',
    packages: ['framer-motion', 'recharts', 'lucide-react', 'embla-carousel-react', 'vaul', 'cmdk'],
  },
  {
    name: 'vendor-data',
    packages: ['ajv', 'ajv-formats', 'zod', 'dexie', 'date-fns', 'jexl', 'croner'],
  },
]

function getManualChunkName(id) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  const normalizedId = id.replace(/\\/g, '/')

  for (const group of MANUAL_CHUNK_GROUPS) {
    if (group.packages.some((pkg) => normalizedId.includes(`/node_modules/${pkg}`))) {
      return group.name
    }
  }

  return 'vendor-misc'
}

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
    } : {
      rollupOptions: {
        output: {
          manualChunks: getManualChunkName,
        },
      },
    }
  }
})

