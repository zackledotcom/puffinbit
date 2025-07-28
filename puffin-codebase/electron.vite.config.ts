import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@services': resolve('src/main/services'),
        '@utils': resolve('src/main/utils'),
        '@core': resolve('src/main/core'),
        '@types': resolve('src/types'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        external: [
          'better-sqlite3',
          'chromadb',
          'snoowrap'
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@types': resolve('src/types'),
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        '@components': resolve('src/renderer/src/components'),
        '@lib': resolve('src/renderer/src/lib'),
        '@hooks': resolve('src/renderer/src/hooks'),
        '@store': resolve('src/renderer/src/store'),
        '@types': resolve('src/renderer/src/types')
      }
    },
    css: {
      postcss: './postcss.config.js'
    }
  }
})
