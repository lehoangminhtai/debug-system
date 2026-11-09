import { z } from 'zod'
import { extractUploads } from '@/lib/pending-files'
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
  // Rich text HTML: bước tái tạo, kết quả, ảnh/video/tệp (file mới là blob: URL tới lúc lưu)
  content: text(),
  reporter: z.string(),
  assignee: z.string(),
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
    ...extractUploads(v.content),
    reporter: v.reporter,
    assignee: v.assignee === UNASSIGNED ? null : v.assignee,
  }
}
