import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 3 môi trường (giống App VCM), mỗi môi trường một file .env.<mode>:
//   npm run dev        → .env.development  (local, XAMPP)
//   npm run build:stg  → .env.staging      (192.168.110.2/web_develop/dts/)
//   npm run build      → .env.production   (192.168.110.7/dts/)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname)
  const base = env.VITE_BASE

  return {
    plugins: [react(), tailwindcss()],
    // Thư mục ứng dụng trên host (route nằm sau #: /dts/#/all)
    base,
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    // Chỉ dùng khi dev với backend ở máy khác: proxy để trình duyệt thấy cùng origin
    // (nginx trên NAS trả 405 cho preflight OPTIONS) — xem .env.development
    server: env.VITE_PROXY_TARGET
      ? {
          proxy: {
            [`${base}backend`]: { target: env.VITE_PROXY_TARGET, changeOrigin: true },
            [`${base}upload`]: { target: env.VITE_PROXY_TARGET, changeOrigin: true },
          },
        }
      : undefined,
    // Chunk chính ~690KB (~210KB gzip) là react-dom + react-router + tanstack; form đã được tách lazy
    build: { chunkSizeWarningLimit: 800 },
  }
})
