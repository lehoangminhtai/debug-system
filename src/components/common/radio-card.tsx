import { Check, type LucideIcon } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { TONES, type Tone } from '@/lib/meta'
import { cn } from '@/lib/utils'

/** Màu viền + nền khi được chọn, theo tông của lựa chọn */
const CHECKED: Record<Tone, string> = {
  primary: 'has-[:checked]:border-primary has-[:checked]:bg-primary-light/50',
  info: 'has-[:checked]:border-info has-[:checked]:bg-info-bg',
  warning: 'has-[:checked]:border-warning has-[:checked]:bg-warning-bg',
  success: 'has-[:checked]:border-success has-[:checked]:bg-success-bg',
  destructive: 'has-[:checked]:border-destructive has-[:checked]:bg-destructive-bg',
  neutral: 'has-[:checked]:border-foreground/40 has-[:checked]:bg-muted',
}

/** Thẻ radio dùng <input type="radio"> gốc: phím mũi tên, focus khi lỗi và RHF register hoạt động sẵn */
export function RadioCard({
  registration,
  value,
  title,
  hint,
  icon: Icon,
  tone = 'primary',
  type = 'radio',
  describedBy,
}: {
  registration: UseFormRegisterReturn
  value: string
  title: string
  hint?: string
  icon?: LucideIcon
  tone?: Tone
  /** checkbox: chọn nhiều (ô vuông có dấu tick) */
  type?: 'radio' | 'checkbox'
  describedBy?: string
}) {
  return (
    <label
      className={cn(
        'bg-card flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-150',
        'hover:bg-accent',
        CHECKED[tone],
        'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
      )}
    >
      <input type={type} value={value} {...registration} aria-describedby={describedBy} className="peer sr-only" />
      {type === 'radio' ? (
        <span
          aria-hidden
          className="bg-card border-input peer-checked:border-primary mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-full border peer-checked:border-[5px]"
        />
      ) : (
        <span
          aria-hidden
          className="bg-card border-input peer-checked:border-primary peer-checked:bg-primary text-primary-foreground mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-sm border [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {Icon && (
        <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', TONES[tone])}>
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
      </span>
    </label>
  )
}
