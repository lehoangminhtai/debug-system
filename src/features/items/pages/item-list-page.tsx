import type { SortingState } from '@tanstack/react-table'
import { Inbox, SearchX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TablePager } from '@/features/bugs/components/table-pager'
import { useScope } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { useBugs, useFeatures } from '@/services/queries'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '../components/item-filters'
import { ItemTable, type ItemRow } from '../components/item-table'
import { FILTER_FIELDS, PAGE_SIZE, matchFeature, scopeOf, useBugQuery, useItemFilters } from '../hooks/use-item-filters'

/**
 * /:scope — một bảng chung cho Bug và Tính năng mong muốn, phân biệt bằng cột "Loại" (có bộ lọc).
 * Bug lọc/tìm ở server (Bug@index), đề xuất tải hết theo dự án rồi lọc ở client; sắp xếp chung ở client.
 */
export function ItemListPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending, openCreate } = useScope()
  const { filters, clear, isActive } = useItemFilters()
  const scope = scopeOf(filters)

  const bugQuery = useBugQuery(filters, project?.key)
  const bugs = useBugs(bugQuery, !scopePending && scope.bugs)
  const features = useFeatures(project?.key, !scopePending && scope.features)

  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const visibleFeatures = scope.features ? (features.data ?? []).filter((f) => matchFeature(filters, f)) : []
  const rows: ItemRow[] = [
    ...(scope.bugs ? (bugs.data ?? []) : []).map((data) => ({ kind: 'bug' as const, data })),
    ...visibleFeatures.map((data) => ({ kind: 'feature' as const, data })),
  ]

  // Trang hiện tại gắn với bộ lọc + sắp xếp: đổi → về trang đầu; kết quả ít đi → không vượt quá trang cuối
  const sig = JSON.stringify([filters, sorting])
  const [pageState, setPageState] = useState({ sig, page: 0 })
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1)
  const page = Math.min(pageState.sig === sig ? pageState.page : 0, lastPage)

  const isPending = scopePending || (scope.bugs && bugs.isPending) || (scope.features && features.isPending)
  const failed = (scope.bugs && bugs.isError) || (scope.features && features.isError)

  if (failed)
    return (
      <ErrorState
        onRetry={() => {
          if (bugs.isError) void bugs.refetch()
          if (features.isError) void features.refetch()
        }}
      />
    )

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        {/* Filter nằm ở header bảng; chỉ hiện ở đây khi cột tương ứng không hiển thị */}
        <ColumnFilter field="type" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="platform" variant="toolbar" className="xl:hidden" />
        {/* "Cốt lõi" chỉ áp cho bug, không có cột riêng trong bảng gộp */}
        <ColumnFilter field="core" variant="toolbar" />
        <ColumnFilter field="level" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="status" variant="toolbar" className="md:hidden" />
        {rows.length > PAGE_SIZE ? (
          <TablePager page={page} total={rows.length} onPageChange={(p) => setPageState({ sig, page: p })} />
        ) : (
          <ResultCount kind={filters.type ?? 'item'} n={isPending ? undefined : rows.length} />
        )}
      </div>
      <ActiveFilters fields={FILTER_FIELDS} />
      {isPending ? (
        <div className="bg-card flex flex-1 flex-col gap-2 rounded-lg border p-3" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : rows.length === 0 && !isActive() ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={Inbox}
            title={t('empty.noItems')}
            description={t('empty.noItemsDesc')}
            action={<Button onClick={openCreate}>{t('action.createItem')}</Button>}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={SearchX}
            title={t('empty.noItemMatch')}
            description={t('empty.noMatchDesc')}
            action={
              <Button variant="outline" onClick={clear}>
                {t('action.clearFilters')}
              </Button>
            }
          />
        </div>
      ) : (
        <ItemTable rows={rows} pageIndex={page} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  )
}
