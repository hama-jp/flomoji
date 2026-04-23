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
  const normalizedId = id.replace(/\\/g, '/')

  // Keep Rollup's shared commonjs helper in vendor-react so the React chunk
  // has no outbound cross-chunk imports. Otherwise Rollup places the helper
  // in an arbitrary chunk (e.g. vendor-data), which creates a cycle
  // vendor-react → vendor-data → vendor-misc → vendor-react and causes
  // "Cannot set properties of undefined (setting 'Children')" at load time.
  if (normalizedId.includes('commonjsHelpers.js')) {
    return 'vendor-react'
  }

  if (!normalizedId.includes('node_modules')) {
    return undefined
  }

  for (const group of MANUAL_CHUNK_GROUPS) {
    if (group.packages.some((pkg) => {
      const needle = pkg.endsWith('/') ? pkg : `${pkg}/`
      return normalizedId.includes(`/node_modules/${needle}`)
    })) {
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

