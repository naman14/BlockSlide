import reactRefresh from '@vitejs/plugin-react-refresh'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRefresh()
  ],
  build: {
    target: 'es2015'
  },
  esbuild: {
    jsxInject: `import React from 'react'`
  },
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, '/src/game/components'),
      '@lib': path.resolve(__dirname, '/src/game/lib'),
      '@assets': path.resolve(__dirname, '/src/assets'),
      '@css': path.resolve(__dirname, '/src/css')
    }
  }
})
