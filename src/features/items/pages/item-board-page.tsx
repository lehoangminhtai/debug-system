import { Bug as BugIcon, Lightbulb } from 'lucide-react'
import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { KanbanBoard } from '@/features/bugs/components/kanban-board'
import { useScope } from '@/features/bugs/hooks/use-scope'
import { FeatureKanban } from '@/features/feature-requests/components/feature-kanban'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { useBugs, useFeatures } from '@/services/queries'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '../components/item-filters'
import {
  useBugQuery,
  useFeatureQuery,
  useItemFilters,
  type FilterParam,
  type ItemType,
} from '../hooks/use-item-filters'

// Kanban đã chia cột theo trạng thái → không lọc trạng thái/mức độ ở đây
const BOARD_IGNORED: FilterParam[] = ['status', 'fstatus', 'severity']

/** Chọn loại hiển thị trên Kanban (bug và đề xuất có bộ trạng thái khác nhau nên không gộp chung một bảng) */
function TypeSwitch({ value, onChange }: { value: ItemType; onChange: (v: ItemType) => void }) {
  const { t } = useI18n()
  const items = [
    { v: 'bug' as const, icon: BugIcon, label: t('type.bug') },
    { v: 'feature' as const, icon: Lightbulb, label: t('type.feature') },
  ]
  return (
    <div
      role="radiogroup"
      aria-label={t('board.type')}
      className="bg-card flex items-center gap-0.5 rounded-lg border p-0.5 shadow-xs"
    >
      {items.map((i) => (
        <button
          key={i.v}
          type="button"
          role="radio"
          aria-checked={value === i.v}
          onClick={() => onChange(i.v)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            value === i.v
              ? 'bg-primary-light text-primary-hover'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <i.icon className="size-4" aria-hidden />
          {i.label}
        </button>
      ))}
    </div>
  )
}

/** /:scope/board — Kanban của bug hoặc của đề xuất, chọn bằng ?type= (mặc định bug) */
export function ItemBoardPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending } = useScope()
  const { filters, setFilter } = useItemFilters()
  const type: ItemType = filters.type ?? 'bug'
  const isBug = type === 'bug'

  // Server sắp trong cột: mức độ trước, cùng mức thì mới nhất trước
  const bugQuery = useBugQuery(filters, project?.key, BOARD_IGNORED)
  const featureQuery = useFeatureQuery(filters, project?.key, BOARD_IGNORED)
  const bugs = useBugs({ ...bugQuery, sortBy: 'severity', sortDir: 'asc' }, !scopePending && isBug)
  const features = useFeatures({ ...featureQuery, sortBy: 'priority', sortDir: 'asc' }, !scopePending && !isBug)
  const query = isBug ? bugs : features
  const isPending = scopePending || query.isPending
  const visibleBugs = bugs.data ?? []
  const visibleFeatures = features.data ?? []
  const n = isBug ? visibleBugs.length : visibleFeatures.length

  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />

  return (
    <div className="flex flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <TypeSwitch value={type} onChange={(v) => setFilter('type', v)} />
        <SearchBox />
        <ColumnFilter field="mine" variant="toolbar" />
        <ColumnFilter field="platform" variant="toolbar" />
        {isBug ? (
          <ColumnFilter field="core" variant="toolbar" only="bug" />
        ) : (
          <ColumnFilter field="level" variant="toolbar" only="feature" />
        )}
        <ResultCount kind={type} n={isPending ? undefined : n} />
      </div>
      <ActiveFilters fields={isBug ? ['mine', 'platform', 'core'] : ['mine', 'platform', 'level']} />
      {isPending ? (
        <div className={cn('grid gap-3', isBug ? 'lg:grid-cols-4' : 'xl:grid-cols-5')} aria-label={t('common.loading')}>
          {Array.from({ length: isBug ? 4 : 5 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : isBug ? (
        <KanbanBoard bugs={visibleBugs} />
      ) : (
        <FeatureKanban features={visibleFeatures} />
      )}
    </div>
  )
}
