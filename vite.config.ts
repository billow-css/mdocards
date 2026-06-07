import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode !== 'web' && (command === 'serve' || command === 'build')
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
            },
            preload: {
              input: 'electron/preload.ts',
            },
          }),
        ]
      : []),
  ],
  build: {
    cssMinify: false,
  },
}))
