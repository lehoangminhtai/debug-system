import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/utils'

export interface ControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

interface BaseProps {
  id: string
  label: ReactNode
  icon?: LucideIcon
  hint?: ReactNode
  /** Thông điệp từ zod dạng "v.tooLong|200" (key i18n | tham số max) */
  error?: string
  required?: boolean
  className?: string
}

function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive-text">
      *
    </span>
  )
}

function useMessage(id: string, error?: string, hint?: ReactNode) {
  const { t } = useI18n()
  const [key, max] = error?.split('|') ?? []
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const message = error ? (
    <p id={`${id}-error`} className="text-destructive-text text-xs">
      {t(key as TKey, { max })}
    </p>
  ) : (
    hint && (
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </p>
    )
  )
  return { describedBy, message }
}

/** Nhãn + control + gợi ý/lỗi, liên kết qua aria-describedby */
export function Field({
  id,
  label,
  icon: Icon,
  hint,
  error,
  required,
  className,
  children,
}: BaseProps & { children: (control: ControlProps) => ReactNode }) {
  const { describedBy, message } = useMessage(id, error, hint)
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="gap-1.5 text-sm font-medium">
        {Icon && <Icon className="text-primary size-4 shrink-0" aria-hidden />}
        {label}
        {required && <RequiredMark />}
      </Label>
      {children({
        id,
        'aria-invalid': !!error || undefined,
        'aria-describedby': describedBy,
        'aria-required': required,
      })}
      {message}
    </div>
  )
}

/** Nhóm radio: fieldset + legend; children nhận aria-describedby cho từng input */
export function FieldSet({
  id,
  label,
  icon: Icon,
  hint,
  error,
  required,
  className,
  children,
}: BaseProps & { children: (describedBy?: string) => ReactNode }) {
  const { describedBy, message } = useMessage(id, error, hint)
  return (
    <fieldset id={id} className={cn('flex flex-col gap-1.5', className)} aria-invalid={!!error || undefined}>
      <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        {Icon && <Icon className="text-primary size-4 shrink-0" aria-hidden />}
        {label}
        {required && <RequiredMark />}
      </legend>
      {children(describedBy)}
      {message}
    </fieldset>
  )
}
