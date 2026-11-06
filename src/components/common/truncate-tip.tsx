import { useRef, useState, type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Có phần tử nào (chính nó hoặc con) bị cắt chữ không */
const clipped = (el: HTMLElement) =>
  [el, ...el.querySelectorAll<HTMLElement>('*')].some((e) => e.scrollWidth > e.clientWidth)

/**
 * Bọc nội dung đã `truncate`: chỉ hiện tooltip (đầy đủ chữ) khi nội dung thật sự bị cắt.
 * Phần tử con phải tự có class `truncate` / `min-w-0`.
 */
export function TruncateTip({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // chỉ mở khi nội dung thật sự bị cắt (đo ngay lúc Radix định mở)
  return (
    <Tooltip open={open} onOpenChange={(o) => setOpen(o && !!ref.current && clipped(ref.current))}>
      <TooltipTrigger asChild>
        <div ref={ref} className={className ?? 'min-w-0'}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-words">{label}</TooltipContent>
    </Tooltip>
  )
}
