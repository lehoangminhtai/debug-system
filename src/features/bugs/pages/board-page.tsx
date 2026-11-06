import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/states'
import { useI18n } from '@/i18n'
import { useBugs } from '@/services/queries'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '../components/bug-filters'
import { KanbanBoard } from '../components/kanban-board'
import { useBugFilters, type FilterField } from '../hooks/use-bug-filters'
import { useScope } from '../hooks/use-scope'

// Kanban đã chia cột theo trạng thái → không lọc trạng thái/mức độ ở đây
const BOARD_IGNORED: FilterField[] = ['status', 'severity']
const BOARD_FIELDS: FilterField[] = ['platform', 'core']

export function BoardPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending } = useScope()
  const { useQuery } = useBugFilters()
  const bugsQuery = useBugs(useQuery(project?.key, BOARD_IGNORED), !scopePending)
  const { isError, refetch } = bugsQuery
  const isPending = scopePending || bugsQuery.isPending
  const visible = bugsQuery.data ?? []

  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <div className="flex flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        <ColumnFilter field="platform" variant="toolbar" />
        <ColumnFilter field="core" variant="toolbar" />
        <ResultCount n={isPending ? undefined : visible.length} />
      </div>
      <ActiveFilters fields={BOARD_FIELDS} />
      {isPending ? (
        <div className="grid gap-3 lg:grid-cols-4" aria-label={t('common.loading')}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <KanbanBoard bugs={visible} />
      )}
    </div>
  )
}
