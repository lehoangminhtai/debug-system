import { Check, Clock, User } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useI18n } from '@/i18n'
import { statusRank } from '@/lib/rules'
import { cn, formatTs } from '@/lib/utils'
import { STATUSES, type Bug } from '@/types'

/** Thanh tiến trình 4 bước Mới → Đang sửa → Đã sửa → Đóng. Mỗi bước đã qua hiện ai làm, ngày nào. */
export function StatusStepper({ bug }: { bug: Bug }) {
  const { t } = useI18n()
  const current = statusRank(bug.status)

  return (
    <ol className="grid w-full gap-3 sm:grid-cols-4 sm:gap-0">
      {STATUSES.map((status, i) => {
        const done = i < current
        const active = i === current
        // lần gần nhất bug bước vào trạng thái này
        const entry = i <= current ? bug.history.findLast((h) => h.status === status) : undefined
        return (
          <li
            key={status}
            aria-current={active ? 'step' : undefined}
            style={{ '--i': i } as CSSProperties}
            className="relative flex gap-3 sm:flex-col sm:gap-2"
          >
            {/* đường nối giữa các bước */}
            <span
              aria-hidden
              className={cn(
                'absolute top-6 left-3 h-[calc(100%-12px)] w-px sm:top-3 sm:left-[calc(var(--i)*(33.333%-8px)+24px)] sm:h-px sm:w-[calc(133.333%-32px)]',
                done ? 'bg-primary' : 'bg-border',
                i === STATUSES.length - 1 && 'hidden', // chỉ nối giữa các vòng tròn
              )}
            />
            <span
              aria-hidden
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold sm:ml-[calc(var(--i)*(33.333%-8px))]',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-card text-primary ring-primary-light ring-4',
                !done && !active && 'bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div
              className={cn(
                'min-w-0 pb-1 sm:w-full',
                // vòng 1 sát trái, vòng 4 sát phải, hai vòng giữa căn chữ theo tâm vòng
                i === 0 && 'sm:text-left',
                i === STATUSES.length - 1 && 'sm:text-right',
                i > 0 && i < STATUSES.length - 1 && 'sm:ml-[calc(var(--i)*(33.333%-8px)+12px-50%)] sm:text-center',
              )}
            >
              <p className={cn('text-sm font-medium', !done && !active && 'text-muted-foreground')}>
                {t(`status.${status}`)}
                {active && <span className="sr-only"> — {t('detail.stepCurrent')}</span>}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed max-2xl:text-[11px]">
                {entry ? (
                  <>
                    <span className="max-2xl:block">
                      <User className="inline size-3.5 align-text-bottom max-2xl:size-3" aria-hidden />{' '}
                      <span className="text-foreground font-medium">{entry.who}</span>
                    </span>
                    <span className="max-2xl:hidden"> · </span>
                    <span className="max-2xl:block">
                      <Clock
                        className="text-primary-hover inline size-3.5 align-text-bottom max-2xl:size-3"
                        aria-hidden
                      />{' '}
                      <time dateTime={entry.createdAt} className="text-primary-hover font-medium tabular-nums">
                        {formatTs(entry.createdAt)}
                      </time>
                    </span>
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
