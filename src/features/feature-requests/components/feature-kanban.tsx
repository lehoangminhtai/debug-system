import { ArrowRightLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PlatformBadge, PriorityBadge } from '@/components/common/badges'
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
import { FROM_LIST } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { FEATURE_STATUS_META, TONE_TEXT } from '@/lib/meta'
import { cn } from '@/lib/utils'
import { useChangeFeatureStatus } from '@/services/queries'
import { FEATURE_STATUSES, PRIORITIES, type Feature, type FeatureStatus } from '@/types'
import { RejectDialog } from './reject-dialog'

// ponytail: cùng cách làm với Kanban bug — HTML5 drag & drop gốc, menu "Chuyển sang" thay cho touch.

function KanbanCard({
  feature: f,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  feature: Feature
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (status: FeatureStatus) => void
}) {
  const { t } = useI18n()
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', f.code)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      aria-label={`${f.code} ${f.title}`}
      className={cn(
        'group bg-card hover:border-primary/40 relative flex cursor-grab flex-col gap-2 rounded-lg border p-3 transition-[opacity,border-color] duration-150 active:cursor-grabbing',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs font-medium">{f.code}</span>
        <PriorityBadge priority={f.priority} />
        <DropdownMenu>
          <Hint label={t('action.moveTo')}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground relative z-10 -my-1 -mr-1.5 ml-auto size-7"
                aria-label={t('action.cardMenu', { code: f.code })}
              >
                <ArrowRightLeft className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-muted-foreground text-xs">{t('action.moveTo')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={f.status} onValueChange={(v) => onMove(v as FeatureStatus)}>
              {FEATURE_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(`featureStatus.${s}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Link
        to={`/features/${f.code}`}
        state={FROM_LIST}
        draggable={false}
        className="focus-visible:after:ring-ring line-clamp-2 text-sm font-medium break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2"
      >
        {f.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <PlatformBadge platform={f.platform} />
        <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-xs">
          {f.assignee ? (
            <>
              <UserAvatar name={f.assignee} />
              <span className="sr-only">{t('field.owner')}:</span>
              {f.assignee}
            </>
          ) : (
            t('table.unassigned')
          )}
        </span>
      </div>
    </article>
  )
}

export function FeatureKanban({ features }: { features: Feature[] }) {
  const { t } = useI18n()
  const changeStatus = useChangeFeatureStatus()
  const [dragCode, setDragCode] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<FeatureStatus | null>(null)
  // Kéo vào "Từ chối" → hỏi lý do trước (spec §4)
  const [rejecting, setRejecting] = useState<Feature | null>(null)

  const move = (f: Feature, status: FeatureStatus, rejectReason?: string) => {
    if (f.status === status) return
    if (status === 'rejected' && rejectReason === undefined) return setRejecting(f)
    changeStatus.mutate(
      { code: f.code, status, rejectReason },
      {
        onSuccess: () => {
          setRejecting(null)
          toast.success(t('toast.statusChanged', { code: f.code, status: t(`featureStatus.${status}`) }))
        },
      },
    )
  }

  const byColumn = (s: FeatureStatus) =>
    features
      .filter((f) => f.status === s)
      .sort(
        (a, b) =>
          PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || b.createdAt.localeCompare(a.createdAt),
      )

  return (
    <>
      <div
        role="region"
        aria-label={t('board.label')}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-5 xl:overflow-visible xl:px-0"
      >
        {FEATURE_STATUSES.map((status) => {
          const items = byColumn(status)
          const { icon: Icon, tone } = FEATURE_STATUS_META[status]
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
                const f = features.find((x) => x.code === e.dataTransfer.getData('text/plain'))
                if (f) move(f, status)
                setOverColumn(null)
              }}
              className={cn(
                'bg-card/50 flex w-72 shrink-0 snap-start flex-col rounded-lg border transition-colors duration-150 xl:w-auto',
                isOver && 'border-ring bg-primary-light/40',
              )}
            >
              <h2 id={`col-${status}`} className="flex items-center gap-2 px-3 pt-3 pb-2 text-base font-semibold">
                <Icon className={cn('size-4', TONE_TEXT[tone])} aria-hidden />
                {t(`featureStatus.${status}`)}
                <span className="text-muted-foreground ml-auto text-xs font-medium tabular-nums">{items.length}</span>
              </h2>
              <ul className="flex min-h-32 flex-1 flex-col gap-2 p-2 pt-0">
                {items.length === 0 ? (
                  <li className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-sm">
                    {t('empty.featureColumn')}
                  </li>
                ) : (
                  items.map((f) => (
                    <li key={f.id}>
                      <KanbanCard
                        feature={f}
                        dragging={dragCode === f.code}
                        onDragStart={() => setDragCode(f.code)}
                        onDragEnd={() => {
                          setDragCode(null)
                          setOverColumn(null)
                        }}
                        onMove={(s) => move(f, s)}
                      />
                    </li>
                  ))
                )}
              </ul>
            </section>
          )
        })}
      </div>
      {rejecting && (
        <RejectDialog
          feature={rejecting}
          open
          onOpenChange={(o) => !o && setRejecting(null)}
          busy={changeStatus.isPending}
          onConfirm={(reason) => move(rejecting, 'rejected', reason)}
        />
      )}
    </>
  )
}
