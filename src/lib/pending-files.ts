// File mới chèn vào editor: hiện bằng object URL, gửi lên lúc lưu (multipart files[N]).
// Tách khỏi lib/rich-content (Tiptap) để schema form không kéo cả editor vào bundle chính.
import type { UploadFile } from '@/types'

// ponytail: không thu hồi object URL — vài file mỗi lần mở form, mất khi tải lại trang
const pending = new Map<string, UploadFile>()

export function addPendingFile(blob: Blob, name: string): string {
  const url = URL.createObjectURL(blob)
  pending.set(url, { blob, name })
  return url
}

/** `blob:` → `upload:N` (backend thay bằng đường dẫn thật), kèm file theo đúng thứ tự N */
export function extractUploads(html: string): { content: string; files: UploadFile[] } {
  const files: UploadFile[] = []
  const index = new Map<string, number>()
  const content = html.replace(/\b(src|href)="(blob:[^"]+)"/g, (match, attr: string, url: string) => {
    const file = pending.get(url)
    if (!file) return match // không còn file → backend tự loại link/ảnh này
    if (!index.has(url)) index.set(url, files.push(file) - 1)
    return `${attr}="upload:${index.get(url)}"`
  })
  return { content, files }
}
