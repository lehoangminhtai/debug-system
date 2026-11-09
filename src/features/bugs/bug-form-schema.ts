import { z } from 'zod'
import type { MediaValue } from '@/lib/media'
import { PLATFORMS, SEVERITIES, type BugInput } from '@/types'

export const UNASSIGNED = '__none'

/** Ô chữ: không bắt buộc, không giới hạn số ký tự */
export const text = () => z.string()

/** Chỉ "Dự án" là bắt buộc (cần để cấp mã FF-001); mọi ô khác bỏ trống được, backend tự đặt mặc định */
export const schema = z.object({
  projectId: z.string().min(1, 'v.required'),
  title: text(),
  platform: z.array(z.enum(PLATFORMS)),
  isCore: z.enum(['yes', 'no']).nullish(),
  severity: z.enum(SEVERITIES).nullish(),
  steps: z.array(z.object({ value: text() })),
  expected: text(),
  actual: text(),
  note: text(),
  reporter: z.string(),
  assignee: z.string(),
  // Ảnh + video, không giới hạn số lượng / dung lượng
  images: z.array(z.custom<MediaValue>()),
})
export type BugFormValues = z.infer<typeof schema>

export function toBugInput(v: BugFormValues): BugInput {
  return {
    projectId: Number(v.projectId),
    title: v.title.trim(),
    platform: v.platform,
    // chưa chọn → không gửi, backend mặc định (không cốt lõi, Trung bình)
    isCore: v.isCore ? v.isCore === 'yes' : undefined,
    severity: v.severity ?? undefined,
    steps: v.steps
      .map((s) => s.value.trim())
      .filter(Boolean)
      .join('\n'),
    expected: v.expected.trim(),
    actual: v.actual.trim(),
    note: v.note.trim(),
    reporter: v.reporter,
    assignee: v.assignee === UNASSIGNED ? null : v.assignee,
    images: v.images.map((m) =>
      m.file
        ? { file: m.file, name: m.name ?? 'file', caption: m.caption.trim() }
        : { url: m.url, caption: m.caption.trim() },
    ),
  }
}
