import type { SortingState } from '@tanstack/react-table'
import { Inbox, SearchX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TablePager } from '@/features/bugs/components/table-pager'
import { useScope } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { useItems } from '@/services/queries'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '../components/item-filters'
import { ItemTable } from '../components/item-table'
import { FILTER_FIELDS, PAGE_SIZE, useItemFilters, useItemQuery } from '../hooks/use-item-filters'

/**
 * /:scope — một bảng chung cho Bug và Tính năng mong muốn, phân biệt bằng cột "Loại" (có bộ lọc).
 * Lọc, tìm, sắp xếp, phân trang và đếm tổng đều ở server (Item@index); FE chỉ hiển thị trang hiện tại.
 */
export function ItemListPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending, openCreate } = useScope()
  const { filters, clear, isActive } = useItemFilters()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  // Trang hiện tại gắn với bộ lọc + sắp xếp: đổi → về trang đầu
  const sig = JSON.stringify([filters, sorting])
  const [pageState, setPageState] = useState({ sig, page: 0 })
  const page = pageState.sig === sig ? pageState.page : 0

  const items = useItems(useItemQuery(filters, project?.key, sorting, page), !scopePending)
  const rows = items.data?.items ?? []
  const total = items.data?.total ?? 0
  const isPending = scopePending || items.isPending
  // Dữ liệu ít đi (người khác xoá) → trang hiện tại vượt quá trang cuối: lùi về trang cuối
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
  if (items.data && !items.isPlaceholderData && page > lastPage) setPageState({ sig, page: lastPage })

  if (items.isError && !items.data) return <ErrorState onRetry={() => void items.refetch()} />

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        <ColumnFilter field="mine" variant="toolbar" />
        {/* Filter nằm ở header bảng; chỉ hiện ở đây khi cột tương ứng không hiển thị */}
        <ColumnFilter field="type" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="platform" variant="toolbar" className="xl:hidden" />
        {/* "Cốt lõi" chỉ áp cho bug, không có cột riêng trong bảng gộp */}
        <ColumnFilter field="core" variant="toolbar" />
        <ColumnFilter field="level" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="status" variant="toolbar" className="md:hidden" />
        {total > PAGE_SIZE ? (
          <TablePager page={page} total={total} onPageChange={(p) => setPageState({ sig, page: p })} />
        ) : (
          <ResultCount kind={filters.type ?? 'item'} n={isPending ? undefined : total} />
        )}
      </div>
      <ActiveFilters fields={FILTER_FIELDS} />
      {isPending ? (
        <div className="bg-card flex flex-1 flex-col gap-2 rounded-lg border p-3" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : total === 0 && !isActive() ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={Inbox}
            title={t('empty.noItems')}
            description={t('empty.noItemsDesc')}
            action={<Button onClick={openCreate}>{t('action.createItem')}</Button>}
          />
        </div>
      ) : total === 0 ? (
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
        <ItemTable rows={rows} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  )
}
