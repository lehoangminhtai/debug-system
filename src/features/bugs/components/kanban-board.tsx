import { ArrowRightLeft, Target } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MustFixBadge, PlatformBadge, SeverityBadge } from '@/components/common/badges'
import { Hint } from '@/components/common/hint'
import { UserAvatar } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n'
import { STATUS_META, TONE_TEXT } from '@/lib/meta'
import { severityRank } from '@/lib/rules'
import { cn } from '@/lib/utils'
import { useChangeStatus } from '@/services/queries'
import { STATUSES, type Bug, type Status } from '@/types'
import { FROM_LIST } from '../hooks/use-scope'

// ponytail: HTML5 drag & drop gốc — không chạy trên touch, nên mỗi thẻ có menu "Chuyển sang" làm phương án thay thế.
// Cần kéo thả trên touch/sắp xếp trong cột → chuyển sang @dnd-kit.

function KanbanCard({
  bug,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  bug: Bug
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (status: Status) => void
}) {
  const { t } = useI18n()
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', bug.code)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      aria-label={`${bug.code} ${bug.title}`}
      className={cn(
        'group bg-card hover:border-primary/40 relative flex cursor-grab flex-col gap-2 rounded-lg border p-3 transition-[opacity,border-color] duration-150 active:cursor-grabbing',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs font-medium">{bug.code}</span>
        <SeverityBadge severity={bug.severity} />
        <DropdownMenu>
          <Hint label={t('action.moveTo')}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground relative z-10 -my-1 -mr-1.5 ml-auto size-7"
                aria-label={t('action.cardMenu', { code: bug.code })}
              >
                <ArrowRightLeft className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-muted-foreground text-xs">{t('action.moveTo')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={bug.status} onValueChange={(v) => onMove(v as Status)}>
              {STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(`status.${s}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Link
        to={`/bugs/${bug.code}`}
        state={FROM_LIST}
        draggable={false}
        className="focus-visible:after:ring-ring line-clamp-2 text-sm font-medium break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2"
      >
        {bug.title || t('common.untitled')}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <PlatformBadge platform={bug.platform} />
        {bug.isCore && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Target className="size-3.5" aria-hidden />
            {t('field.core')}
          </span>
        )}
        {bug.mustFix && bug.status !== 'closed' && <MustFixBadge />}
        <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-xs">
          {bug.assignee ? (
            <>
              <UserAvatar name={bug.assignee} />
              <span className="sr-only">{t('field.assignee')}:</span>
              {bug.assignee}
            </>
          ) : (
            t('table.unassigned')
          )}
        </span>
      </div>
    </article>
  )
}

export function KanbanBoard({ bugs }: { bugs: Bug[] }) {
  const { t } = useI18n()
  const changeStatus = useChangeStatus()
  const [dragCode, setDragCode] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<Status | null>(null)

  const move = (bug: Bug, status: Status) => {
    if (bug.status === status) return
    changeStatus.mutate(
      { code: bug.code, status },
      { onSuccess: () => toast.success(t('toast.statusChanged', { code: bug.code, status: t(`status.${status}`) })) },
    )
  }

  const byColumn = (s: Status) =>
    bugs
      .filter((b) => b.status === s)
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.createdAt.localeCompare(a.createdAt))

  return (
    <div
      role="region"
      aria-label={t('board.label')}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0"
    >
      {STATUSES.map((status) => {
        const items = byColumn(status)
        const { icon: Icon, tone } = STATUS_META[status]
        const isOver = overColumn === status && dragCode !== null
        return (
          <section
            key={status}
            aria-labelledby={`col-${status}`}
            onDragOver={(e) => {
              if (!dragCode) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setOverColumn(status)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const bug = bugs.find((b) => b.code === e.dataTransfer.getData('text/plain'))
              if (bug) move(bug, status)
              setOverColumn(null)
            }}
            className={cn(
              'bg-card/50 flex w-72 shrink-0 snap-start flex-col rounded-lg border transition-colors duration-150 lg:w-auto',
              isOver && 'border-ring bg-primary-light/40',
            )}
          >
            <h2 id={`col-${status}`} className="flex items-center gap-2 px-3 pt-3 pb-2 text-base font-semibold">
              <Icon className={cn('size-4', TONE_TEXT[tone])} aria-hidden />
              {t(`status.${status}`)}
              <span className="text-muted-foreground ml-auto text-xs font-medium tabular-nums">{items.length}</span>
            </h2>
            <ul className="flex min-h-32 flex-1 flex-col gap-2 p-2 pt-0">
              {items.length === 0 ? (
                <li className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-sm">
                  {t('empty.column')}
                </li>
              ) : (
                items.map((bug) => (
                  <li key={bug.id}>
                    <KanbanCard
                      bug={bug}
                      dragging={dragCode === bug.code}
                      onDragStart={() => setDragCode(bug.code)}
                      onDragEnd={() => {
                        setDragCode(null)
                        setOverColumn(null)
                      }}
                      onMove={(s) => move(bug, s)}
                    />
                  </li>
                ))
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
