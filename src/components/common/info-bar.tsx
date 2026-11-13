import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Dải "Thông tin" nằm ngang dưới thanh tiến trình. Các ô tự xuống hàng theo bề rộng (mỗi ô ≥ 9rem, chia đều phần
 * còn lại); ô nào cần vừa nội dung (vd ô chọn người) thì truyền `className="flex-none"`.
 */
export function InfoBar({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="info-title" className="bg-card rounded-lg border px-4 py-3">
      <h2 id="info-title" className="sr-only">
        {title}
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3">{children}</div>
    </section>
  )
}

/** Một ô: nhãn có icon ở trên, giá trị ở dưới. `htmlFor` khi giá trị là ô chọn (Select). */
export function InfoItem({
  icon: Icon,
  label,
  htmlFor,
  children,
  className,
}: {
  icon: LucideIcon
  label: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <div className={cn('flex min-w-36 flex-1 flex-col gap-1', className)}>
      <Tag htmlFor={htmlFor} className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </Tag>
      <div className="flex min-h-8 min-w-0 items-center text-sm">{children}</div>
    </div>
  )
}
