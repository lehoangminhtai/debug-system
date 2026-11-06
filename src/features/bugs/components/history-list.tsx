import { formatTs } from '@/lib/utils'
import { UserAvatar } from '@/components/common/user-avatar'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import type { BugHistory, Status } from '@/types'

/** Lịch sử: ai · làm gì · lúc nào (mới nhất ở trên) */
export function HistoryList({ history, className }: { history: BugHistory[]; className?: string }) {
  const { t } = useI18n()

  const describe = (h: BugHistory) => {
    switch (h.action) {
      case 'status':
        return t('history.status', { from: t(`status.${h.target as Status}`), to: t(`status.${h.status}`) })
      case 'assign':
        return t('history.assign', { target: h.target ?? '' })
      default:
        return t(`history.${h.action}`)
    }
  }

  return (
    <ol className={cn('flex max-h-80 flex-col overflow-y-auto pr-1', className)}>
      {[...history].reverse().map((h, i, arr) => (
        <li key={h.id} className="relative flex shrink-0 gap-2.5 pb-4 last:pb-0">
          {i < arr.length - 1 && <span aria-hidden className="bg-border absolute top-6 bottom-0 left-2.5 w-px" />}
          <UserAvatar name={h.who} className="relative mt-px" />
          <div className="min-w-0 text-sm">
            <p className="break-words">
              <span className="font-medium">{h.who}</span> <span className="text-muted-foreground">{describe(h)}</span>
            </p>
            <time dateTime={h.createdAt} className="text-muted-foreground text-xs tabular-nums">
              {formatTs(h.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
