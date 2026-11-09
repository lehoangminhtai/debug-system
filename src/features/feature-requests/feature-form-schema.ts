import { z } from 'zod'
import { UNASSIGNED, text } from '@/features/bugs/bug-form-schema'
import type { MediaValue } from '@/lib/media'
import { PLATFORMS, PRIORITIES, type FeatureInput } from '@/types'

export type { MediaValue }

export const schema = z.object({
  projectId: z.string().min(1, 'v.required'),
  title: text(),
  platform: z.array(z.enum(PLATFORMS)),
  priority: z.enum(PRIORITIES).nullish(),
  current: text(),
  desired: text(),
  benefit: text(),
  requester: z.string(),
  assignee: z.string(),
  // Không giới hạn số file / dung lượng (chỉ còn giới hạn upload của server)
  media: z.array(z.custom<MediaValue>()),
})
export type FeatureFormValues = z.infer<typeof schema>

export function toFeatureInput(v: FeatureFormValues): FeatureInput {
  return {
    projectId: Number(v.projectId),
    title: v.title.trim(),
    platform: v.platform,
    priority: v.priority ?? undefined, // chưa chọn → backend mặc định "Nên có"
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
