import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { statusRank } from '@/lib/rules'
import { cn } from '@/lib/utils'
import { STATUSES, type Bug } from '@/types'

/** Thanh tiến trình 4 bước Mới → Đang sửa → Đã sửa → Đóng. Mỗi bước đã qua hiện ai làm, ngày nào. */
export function StatusStepper({ bug }: { bug: Bug }) {
  const { t, formatDate, formatDateTime } = useI18n()
  const current = statusRank(bug.status)

  return (
    <ol className="grid gap-3 sm:grid-cols-4 sm:gap-0">
      {STATUSES.map((status, i) => {
        const done = i < current
        const active = i === current
        // lần gần nhất bug bước vào trạng thái này
        const entry = i <= current ? bug.history.findLast((h) => h.status === status) : undefined
        return (
          <li
            key={status}
            aria-current={active ? 'step' : undefined}
            className="relative flex gap-3 sm:flex-col sm:gap-2 sm:pr-4"
          >
            {/* đường nối giữa các bước */}
            {i < STATUSES.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-6 left-3 h-[calc(100%-12px)] w-px sm:top-3 sm:left-6 sm:h-px sm:w-[calc(100%-24px)]',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-card text-primary ring-primary-light ring-4',
                !done && !active && 'bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 pb-1">
              <p className={cn('text-sm font-medium', !done && !active && 'text-muted-foreground')}>
                {t(`status.${status}`)}
                {active && <span className="sr-only"> — {t('detail.stepCurrent')}</span>}
              </p>
              <p className="text-muted-foreground text-xs">
                {entry ? (
                  <>
                    {entry.who} ·{' '}
                    <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
                      {formatDate(entry.createdAt)}
                    </time>
                  </>
                ) : (
                  t('detail.stepPending')
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
