import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: 5174,
    proxy: {
      '/alive': 'http://localhost:3000',
      '/ocr': 'http://localhost:3000',
      '/jobs': 'http://localhost:3000',
      '/results': 'http://localhost:3000',
    },
  },
})
