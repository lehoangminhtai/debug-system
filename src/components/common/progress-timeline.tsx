import { Check } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { useI18n } from '@/i18n'
import { cn, formatTs } from '@/lib/utils'

export interface TimelineStep {
  key: string
  label: string
  /** Lần gần nhất bước vào trạng thái này (chỉ có với bước đã qua / đang ở) */
  entry?: { who: string; createdAt: string }
}

interface Props {
  steps: TimelineStep[]
  /** Chỉ số bước hiện tại; -1 = không ở bước nào (vd đề xuất bị từ chối) */
  current: number
  label: string
}

/**
 * Tiến trình gọn một dòng: chấm + nhãn nối nhau. Ai làm / lúc nào hiện khi rê chuột hoặc focus vào bước
 * (và đọc được bằng trình đọc màn hình). Màn hẹp: chỉ giữ nhãn bước hiện tại để vừa một dòng.
 */
export function ProgressTimeline({ steps, current, label }: Props) {
  const { t } = useI18n()
  return (
    <ol aria-label={label} className="flex min-w-0 flex-1 items-center">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const detail = s.entry ? `${s.entry.who} · ${formatTs(s.entry.createdAt)}` : t('detail.stepPending')
        return (
          <li
            key={s.key}
            aria-current={active ? 'step' : undefined}
            className={cn('flex min-w-0 items-center', i < steps.length - 1 && 'flex-1')}
          >
            <Hint label={detail}>
              <span
                tabIndex={0}
                className="focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                    done && 'border-primary bg-primary text-primary-foreground',
                    active && 'border-primary bg-card text-primary ring-primary-light ring-3',
                    !done && !active && 'bg-card text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    !done && !active && 'text-muted-foreground',
                    !active && 'max-sm:sr-only',
                  )}
                >
                  {s.label}
                </span>
                <span className="sr-only">
                  {active && ` — ${t('detail.stepCurrent')}`} ({detail})
                </span>
              </span>
            </Hint>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn('mx-2 h-px min-w-3 flex-1', done ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
