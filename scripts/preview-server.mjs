// Khởi động `vite preview` trên bản build cho các script kiểm thử trình duyệt.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

export async function startPreview(port) {
  const base = `http://localhost:${port}/web_develop/dts` // khớp `base` trong vite.config.ts
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'],
    {
      stdio: 'ignore',
    },
  )
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base)
      break
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  // Chrome cài trên máy; PW_CHANNEL=chromium nếu đã `npx playwright install chromium`
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' })
  return {
    base,
    browser,
    stop: async () => {
      await browser.close()
      server.kill()
    },
  }
}
