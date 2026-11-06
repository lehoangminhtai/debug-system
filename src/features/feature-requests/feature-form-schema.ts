import { z } from 'zod'
import { UNASSIGNED, text } from '@/features/bugs/bug-form-schema'
import { PLATFORMS, PRIORITIES, type FeatureInput } from '@/types'

export const MAX_MEDIA = 6
export const MAX_VIDEOS = 2
export const MAX_IMAGE_MB = 5
export const MAX_VIDEO_MB = 30
/** Server đo được: 61 MB qua, 81 MB lỗi 500 (doc API §10) */
export const MAX_REQUEST_MB = 60
export const VIDEO_TYPES = ['video/mp4', 'video/webm']

export interface MediaValue {
  /** Có `id` = file đã lưu trên server; không có = file mới */
  id?: number
  file?: Blob
  name?: string
  type: 'image' | 'video'
  /** URL server hoặc object URL để xem trước */
  url: string
  caption: string
  size: number
}

export const newBytes = (media: MediaValue[]) => media.reduce((n, m) => n + (m.file ? m.size : 0), 0)

export const schema = z.object({
  projectId: z.string().min(1, 'v.required'),
  title: text(200),
  platform: z.array(z.enum(PLATFORMS)).min(1, 'v.required'),
  priority: z.enum(PRIORITIES, { error: 'v.required' }),
  current: text(2000),
  desired: text(2000),
  benefit: text(1000, false),
  requester: z.string().min(1, 'v.required'),
  assignee: z.string(),
  media: z
    .array(z.custom<MediaValue>())
    .max(MAX_MEDIA, 'error.too_many_media')
    .refine((m) => m.filter((x) => x.type === 'video').length <= MAX_VIDEOS, 'error.too_many_videos')
    .refine((m) => newBytes(m) <= MAX_REQUEST_MB * 1024 * 1024, 'error.payload_too_large'),
})
export type FeatureFormValues = z.infer<typeof schema>

export function toFeatureInput(v: FeatureFormValues): FeatureInput {
  return {
    projectId: Number(v.projectId),
    title: v.title.trim(),
    platform: v.platform,
    priority: v.priority,
    current: v.current.trim(),
    desired: v.desired.trim(),
    benefit: v.benefit.trim(),
    requester: v.requester,
    assignee: v.assignee === UNASSIGNED ? null : v.assignee,
    media: v.media.map((m) =>
      m.id !== undefined
        ? { id: m.id, caption: m.caption.trim() }
        : { file: m.file!, name: m.name ?? 'file', caption: m.caption.trim() },
    ),
  }
}
