import { Bug as BugIcon, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { SortingState } from '@tanstack/react-table'
import { useI18n } from '@/i18n'
import { useBugs } from '@/services/queries'
import type { BugQuery } from '@/services/api'
import { ActiveFilters, ColumnFilter, ResultCount, SearchBox } from '../components/bug-filters'
import { BugTable } from '../components/bug-table'
import { TablePager } from '../components/table-pager'
import { FILTER_FIELDS, PAGE_SIZE, useBugFilters } from '../hooks/use-bug-filters'
import { useScope } from '../hooks/use-scope'

/** Cột bảng → tham số sắp xếp của API (cột không có ở đây không sắp xếp được) */
const SORT_BY: Record<string, BugQuery['sortBy']> = {
  code: 'code',
  severity: 'severity',
  status: 'status',
  createdAt: 'created_at',
}

export function BugListPage() {
  const { t } = useI18n()
  const { project, isPending: scopePending } = useScope()
  const { filters, clear, isActive, useQuery } = useBugFilters()
  // Sắp xếp do server làm (Bug@index sort_by/sort_dir); mặc định mới nhất trước
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const sort = sorting[0]
  const bugsQuery = useBugs(
    useQuery(project?.key, [], sort ? { sortBy: SORT_BY[sort.id], sortDir: sort.desc ? 'desc' : 'asc' } : undefined),
    !scopePending,
  )
  const { isError, refetch } = bugsQuery
  const isPending = scopePending || bugsQuery.isPending
  const visible = bugsQuery.data ?? []
  // Trang hiện tại gắn với bộ lọc + sắp xếp: đổi → về trang đầu; kết quả ít đi → không vượt quá trang cuối
  const sig = JSON.stringify([filters, sorting])
  const [pageState, setPageState] = useState({ sig, page: 0 })
  const lastPage = Math.max(0, Math.ceil(visible.length / PAGE_SIZE) - 1)
  const page = Math.min(pageState.sig === sig ? pageState.page : 0, lastPage)

  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div role="search" aria-label={t('filter.label')} className="flex flex-wrap items-center gap-2">
        <SearchBox />
        {/* Filter nằm ở header bảng; chỉ hiện ở đây khi cột tương ứng không hiển thị */}
        <ColumnFilter field="platform" variant="toolbar" className="xl:hidden" />
        <ColumnFilter field="core" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="severity" variant="toolbar" className="md:hidden" />
        <ColumnFilter field="status" variant="toolbar" className="md:hidden" />
        {visible.length > PAGE_SIZE ? (
          <TablePager page={page} total={visible.length} onPageChange={(p) => setPageState({ sig, page: p })} />
        ) : (
          <ResultCount n={isPending ? undefined : visible.length} />
        )}
      </div>
      <ActiveFilters fields={FILTER_FIELDS} />
      {isPending ? (
        <div className="bg-card flex flex-1 flex-col gap-2 rounded-lg border p-3" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : visible.length === 0 && !isActive() ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={BugIcon}
            title={t('empty.noBugs')}
            description={t('empty.noBugsDesc')}
            action={
              <Button asChild>
                <Link to={project ? `/bugs/new?project=${project.key}` : '/bugs/new'}>{t('action.reportBug')}</Link>
              </Button>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-card flex-1 rounded-lg border">
          <EmptyState
            icon={SearchX}
            title={t('empty.noMatch')}
            description={t('empty.noMatchDesc')}
            action={
              <Button variant="outline" onClick={clear}>
                {t('action.clearFilters')}
              </Button>
            }
          />
        </div>
      ) : (
        <BugTable bugs={visible} pageIndex={page} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  )
}
