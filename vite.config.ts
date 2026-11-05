import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Ứng dụng được phục vụ tại /web_develop/dts/ (route nằm sau #: /web_develop/dts/#/all)
  base: '/web_develop/dts/',
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // Chunk chính ~690KB (~210KB gzip) là react-dom + react-router + tanstack; form đã được tách lazy
  build: { chunkSizeWarningLimit: 800 },
})
