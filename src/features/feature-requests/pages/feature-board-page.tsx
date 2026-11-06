import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '@/features/bugs/components/bug-filters'
import type { FeatureFilterField } from '@/features/bugs/hooks/use-bug-filters'
import { useScope } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { useFeatures } from '@/services/queries'
import { FeatureKanban } from '../components/feature-kanban'
import { useFeatureFilters } from '../hooks/use-feature-filters'

// Kanban đã chia cột theo trạng thái → không lọc trạng thái ở đây
const BOARD_IGNORED: FeatureFilterField[] = ['status']
const BOARD_FIELDS: FeatureFilterField[] = ['platform', 'priority']

/** /:scope/features/board */
export function FeatureBoardPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending } = useScope()
  const { match } = useFeatureFilters()
  const query = useFeatures(project?.key, !scopePending)
  const isPending = scopePending || query.isPending
  const visible = (query.data ?? []).filter((f) => match(f, BOARD_IGNORED))

  if (query.isError) return <ErrorState onRetry={query.refetch} />

  return (
    <div className="flex flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        <ColumnFilter kind="feature" field="platform" variant="toolbar" />
        <ColumnFilter kind="feature" field="priority" variant="toolbar" />
        <ResultCount kind="feature" n={isPending ? undefined : visible.length} />
      </div>
      <ActiveFilters kind="feature" fields={BOARD_FIELDS} />
      {isPending ? (
        <div className="grid gap-3 xl:grid-cols-5" aria-label={t('common.loading')}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <FeatureKanban features={visible} />
      )}
    </div>
  )
}
