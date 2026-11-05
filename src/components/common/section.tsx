import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

/** Khối nội dung có viền (không shadow) — dùng thống nhất cho chi tiết bug và form */
export function Section({ title, description, action, children, className, id }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section aria-labelledby={headingId} className={cn('bg-card rounded-lg border', className)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}
