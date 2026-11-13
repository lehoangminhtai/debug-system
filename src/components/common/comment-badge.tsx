import { MessageSquare } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { LOCALES, useI18n } from '@/i18n'
import { useHasUnread } from '@/lib/comment-seen'
import { cn, relativeTime } from '@/lib/utils'
import type { CommentKind, LastComment } from '@/types'

interface Props {
  kind: CommentKind
  code: string
  count: number
  last: LastComment | null
  className?: string
}

/** 💬 N ở danh sách / Kanban; chấm xanh = có bình luận của người khác chưa xem. Không có bình luận → không hiện. */
export function CommentBadge({ kind, code, count, last, className }: Props) {
  const { t, locale } = useI18n()
  const unread = useHasUnread(kind, code, last)
  if (!count) return null

  const label = [
    t('comment.count', { n: count }),
    unread && t('comment.unread'),
    last && `${last.author} · ${relativeTime(last.createdAt, LOCALES[locale].intl)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Hint label={label}>
      <span
        className={cn(
          'text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs tabular-nums',
          unread && 'text-primary font-semibold',
          className,
        )}
      >
        <MessageSquare className="size-3.5" aria-hidden />
        {count}
        {unread && <span className="bg-primary size-1.5 rounded-full" aria-hidden />}
        <span className="sr-only">{label}</span>
      </span>
    </Hint>
  )
}
