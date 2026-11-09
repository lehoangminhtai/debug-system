import { z } from 'zod'
import { UNASSIGNED, text } from '@/features/bugs/bug-form-schema'
import { extractUploads } from '@/lib/pending-files'
import { PLATFORMS, PRIORITIES, type FeatureInput } from '@/types'

export const schema = z.object({
  projectId: z.string().min(1, 'v.required'),
  title: text(),
  platform: z.array(z.enum(PLATFORMS)),
  priority: z.enum(PRIORITIES).nullish(),
  // Rich text HTML: hiện tại, mong muốn, lợi ích, ảnh/video/tệp
  content: text(),
  requester: z.string(),
  assignee: z.string(),
})
export type FeatureFormValues = z.infer<typeof schema>

export function toFeatureInput(v: FeatureFormValues): FeatureInput {
  return {
    projectId: Number(v.projectId),
    title: v.title.trim(),
    platform: v.platform,
    priority: v.priority ?? undefined, // chưa chọn → backend mặc định "Nên có"
    ...extractUploads(v.content),
    requester: v.requester,
    assignee: v.assignee === UNASSIGNED ? null : v.assignee,
  }
}
