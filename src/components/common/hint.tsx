import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface HintProps {
  label: string
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** true → render nguyên children, không tooltip (vd. sidebar đang mở rộng đã có chữ) */
  disabled?: boolean
}

/** Tooltip cho phần tử chỉ có icon — hiện khi hover và khi focus bằng bàn phím. Phần tử vẫn phải có tên truy cập. */
export function Hint({ label, children, side, disabled }: HintProps) {
  if (disabled) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
