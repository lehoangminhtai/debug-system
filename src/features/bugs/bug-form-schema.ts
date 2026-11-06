import { z } from 'zod'
import { MAX_IMAGES } from '@/lib/image'
import { PLATFORMS, SEVERITIES, type BugInput } from '@/types'

export const UNASSIGNED = '__none'

export const text = (max: number, required = true) =>
  required
    ? z.string().trim().min(1, 'v.required').max(max, `v.tooLong|${max}`)
    : z.string().max(max, `v.tooLong|${max}`)

export const schema = z.object({
  projectId: z.string().min(1, 'v.required'),
  title: text(200),
  platform: z.array(z.enum(PLATFORMS)).min(1, 'v.required'),
  isCore: z.enum(['yes', 'no'], { error: 'v.required' }),
  severity: z.enum(SEVERITIES, { error: 'v.required' }),
  steps: z
    .array(z.object({ value: text(500, false) }))
    .refine((steps) => steps.some((s) => s.value.trim()), 'v.stepsRequired'),
  expected: text(1000),
  actual: text(1000),
  note: text(2000, false),
  reporter: z.string().min(1, 'v.required'),
  assignee: z.string(),
  images: z.array(z.object({ url: z.string(), caption: z.string().max(200) })).max(MAX_IMAGES),
})
export type BugFormValues = z.infer<typeof schema>

export function toBugInput(v: BugFormValues): BugInput {
  return {
    projectId: Number(v.projectId),
    title: v.title.trim(),
    platform: v.platform,
    isCore: v.isCore === 'yes',
    severity: v.severity,
    steps: v.steps
      .map((s) => s.value.trim())
      .filter(Boolean)
      .join('\n'),
    expected: v.expected.trim(),
    actual: v.actual.trim(),
    note: v.note.trim(),
    reporter: v.reporter,
    assignee: v.assignee === UNASSIGNED ? null : v.assignee,
    images: v.images.map((i) => ({ url: i.url, caption: i.caption.trim() })),
  }
}
