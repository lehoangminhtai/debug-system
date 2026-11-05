// Kiểm tra tương phản WCAG 2.2 AA của các cặp token màu trong src/index.css.
// Chạy trong `npm test`. Đổi palette mà vi phạm ngưỡng → test lỗi.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const raw = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
const hex = (name: string): string => {
  const v = raw[name]
  assert.ok(v, `token --${name} không tồn tại`)
  const ref = v.match(/^var\(--([\w-]+)\)$/)
  return ref ? hex(ref[1]) : v
}
const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

// [chữ/thành phần, nền, ngưỡng] — 4.5 cho chữ thường, 3 cho thành phần UI (focus ring, viền trạng thái, icon)
const pairs: [string, string, number][] = [
  ['foreground', 'background', 4.5],
  ['foreground', 'card', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['muted-foreground', 'card', 4.5],
  ['placeholder', 'card', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['primary-foreground', 'primary-hover', 4.5],
  ['primary', 'card', 4.5], // link
  ['primary', 'background', 4.5],
  ['primary-hover', 'primary-light', 4.5], // mục đang chọn, pill "Đã sửa"
  ['destructive-foreground', 'destructive', 4.5],
  ['destructive-text', 'destructive-bg', 4.5],
  ['destructive-text', 'card', 4.5],
  ['success-text', 'success-bg', 4.5],
  ['warning-text', 'warning-bg', 4.5],
  ['info-text', 'info-bg', 4.5],
  ['muted-foreground', 'muted', 4.5],
  ['ring', 'card', 3],
  ['ring', 'background', 3],
  ['ring', 'primary-light', 3],
  ['destructive', 'card', 3], // viền trường lỗi
  ['success', 'card', 3], // icon toast
  ['warning', 'card', 3],
]

for (const [fg, bg, min] of pairs) {
  const r = ratio(fg, bg)
  assert.ok(r >= min, `--${fg} trên --${bg} = ${r.toFixed(2)}:1 < ${min}:1`)
}
console.log(`contrast.test: ${pairs.length} cặp token đạt WCAG AA`)
