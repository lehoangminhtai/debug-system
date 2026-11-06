import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Thư mục ứng dụng trên host, lấy từ VITE_BASE: .env → /web_develop/dts/, .env.deploy → /dts/
  // (route nằm sau #: /web_develop/dts/#/all)
  base: loadEnv(mode, import.meta.dirname).VITE_BASE,
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // Chunk chính ~690KB (~210KB gzip) là react-dom + react-router + tanstack; form đã được tách lazy
  build: { chunkSizeWarningLimit: 800 },
}))
