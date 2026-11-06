import type { SortingState } from '@tanstack/react-table'
import { Lightbulb, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '@/features/bugs/components/bug-filters'
import { TablePager } from '@/features/bugs/components/table-pager'
import { FEATURE_FILTER_FIELDS, PAGE_SIZE, useBugFilters } from '@/features/bugs/hooks/use-bug-filters'
import { useScope } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { useFeatures } from '@/services/queries'
import { FeatureTable } from '../components/feature-table'
import { useFeatureFilters } from '../hooks/use-feature-filters'

/** /:scope/features — cùng bố cục với danh sách bug; lọc ngay tại header bảng */
export function FeatureListPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending } = useScope()
  const { filters, match } = useFeatureFilters()
  const { clear } = useBugFilters()
  const query = useFeatures(project?.key, !scopePending)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const list = query.data ?? []
  // Hiện mọi trạng thái (kể cả Hoàn thành, Từ chối); chỉ lọc theo header bảng
  const visible = list.filter((f) => match(f))

  const sig = JSON.stringify([filters, sorting])
  const [pageState, setPageState] = useState({ sig, page: 0 })
  const lastPage = Math.max(0, Math.ceil(visible.length / PAGE_SIZE) - 1)
  const page = Math.min(pageState.sig === sig ? pageState.page : 0, lastPage)
  const isPending = scopePending || query.isPending
  const newUrl = project ? `/features/new?project=${project.key}` : '/features/new'

  if (query.isError) return <ErrorState onRetry={query.refetch} />

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        {/* Filter nằm ở header bảng; chỉ hiện ở đây khi cột tương ứng không hiển thị */}
        <ColumnFilter kind="feature" field="platform" variant="toolbar" className="xl:hidden" />
        <ColumnFilter kind="feature" field="priority" variant="toolbar" className="md:hidden" />
        <ColumnFilter kind="feature" field="status" variant="toolbar" className="md:hidden" />
        {visible.length > PAGE_SIZE ? (
          <TablePager page={page} total={visible.length} onPageChange={(p) => setPageState({ sig, page: p })} />
        ) : (
          <ResultCount kind="feature" n={isPending ? undefined : visible.length} />
        )}
      </div>
      <ActiveFilters kind="feature" fields={FEATURE_FILTER_FIELDS} />
      {isPending ? (
        <div className="bg-card flex flex-1 flex-col gap-2 rounded-lg border p-3" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={Lightbulb}
            title={t('empty.noFeatures')}
            description={t('empty.noFeaturesDesc')}
            action={
              <Button asChild>
                <Link to={newUrl}>{t('feature.new')}</Link>
              </Button>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={SearchX}
            title={t('empty.noFeatureMatch')}
            description={t('empty.noMatchDesc')}
            action={
              <Button variant="outline" onClick={clear}>
                {t('action.clearFilters')}
              </Button>
            }
          />
        </div>
      ) : (
        <FeatureTable features={visible} pageIndex={page} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  )
}
