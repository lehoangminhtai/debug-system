import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FeatureStatusBadge, PlatformBadge, PriorityBadge } from '@/components/common/badges'
import { UserName } from '@/components/common/user-avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ColumnFilter } from '@/features/bugs/components/bug-filters'
import { PAGE_SIZE, type FeatureFilterField } from '@/features/bugs/hooks/use-bug-filters'
import { FROM_LIST } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { cn, formatTs } from '@/lib/utils'
import { FEATURE_STATUSES, PRIORITIES, type Feature } from '@/types'

// Giống bảng bug: 768–1279px ẩn cột phụ để Tiêu đề đủ rộng
const WIDE_ONLY = new Set(['platform', 'createdAt'])
const FILTER_COLUMNS = new Set<string>(['platform', 'priority', 'status'])
const cellVisibility = (id: string) => (WIDE_ONLY.has(id) ? 'hidden xl:table-cell' : undefined)

interface Props {
  features: Feature[]
  pageIndex: number
  /** Sắp xếp ở client (đã tải hết đề xuất) */
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
}

export function FeatureTable({ features, pageIndex, sorting, onSortingChange }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<Feature>[]>(
    () => [
      {
        id: 'code',
        header: t('field.code'),
        accessorFn: (f) => f.seq,
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.code}</span>,
      },
      {
        id: 'title',
        header: t('field.title'),
        accessorKey: 'title',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/features/${row.original.code}`}
            state={FROM_LIST}
            title={row.original.title}
            className="focus-visible:ring-ring block truncate font-medium hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: 'platform',
        header: t('field.platform'),
        accessorKey: 'platform',
        enableSorting: false,
        cell: ({ row }) => (
          // nhiều nền tảng → xuống dòng trong ô, không tràn sang cột bên cạnh
          <span className="flex flex-wrap gap-1 whitespace-normal">
            <PlatformBadge platform={row.original.platform} />
          </span>
        ),
      },
      {
        id: 'priority',
        header: t('field.priority'),
        // Cần gấp lên trước khi bấm lần đầu
        accessorFn: (f) => PRIORITIES.indexOf(f.priority),
        sortDescFirst: false,
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: 'status',
        header: t('field.status'),
        accessorFn: (f) => FEATURE_STATUSES.indexOf(f.status),
        sortDescFirst: false,
        cell: ({ row }) => <FeatureStatusBadge status={row.original.status} />,
      },
      {
        id: 'assignee',
        header: t('field.owner'),
        accessorFn: (f) => f.assignee ?? '',
        enableSorting: false,
        cell: ({ row }) => <UserName name={row.original.assignee} fallback={t('table.unassigned')} />,
      },
      {
        id: 'createdAt',
        header: t('field.createdAt'),
        accessorKey: 'createdAt',
        sortDescFirst: true,
        cell: ({ row }) => (
          <time dateTime={row.original.createdAt} className="text-muted-foreground whitespace-nowrap">
            {formatTs(row.original.createdAt)}
          </time>
        ),
      },
    ],
    [t],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: features,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: (u) => onSortingChange(typeof u === 'function' ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* < 768px: danh sách thẻ, cùng row model với bảng */}
      <ul className="bg-card divide-y rounded-lg border md:hidden" aria-label={t('feature.tableCaption')}>
        {table.getRowModel().rows.map(({ original: f }) => (
          <li key={f.id}>
            <Link
              to={`/features/${f.code}`}
              state={FROM_LIST}
              className="hover:bg-accent focus-visible:ring-ring flex flex-col gap-1.5 p-3 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-medium">{f.code}</span>
                <span className="text-muted-foreground ml-auto text-xs">{formatTs(f.createdAt)}</span>
              </span>
              <span className="line-clamp-2 text-sm font-medium break-words">{f.title}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <FeatureStatusBadge status={f.status} />
                <PriorityBadge priority={f.priority} />
                <PlatformBadge platform={f.platform} />
                <span className="ml-auto text-xs">
                  <UserName name={f.assignee} fallback={t('table.unassigned')} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="bg-card hidden flex-1 overflow-x-auto rounded-lg border md:block">
        <Table className="table-fixed xl:min-w-[920px]">
          <caption className="sr-only">{t('feature.tableCaption')}</caption>
          <colgroup>
            <col className="w-[104px]" />
            <col />
            <col className="hidden w-[124px] xl:table-column" />
            <col className="w-[164px]" />
            <col className="w-[132px]" />
            <col className="w-[132px]" />
            <col className="hidden w-[160px] xl:table-column" />
          </colgroup>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn('text-muted-foreground h-9 text-xs font-medium', cellVisibility(header.column.id))}
                    >
                      <div className="flex items-center gap-0.5">
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="hover:text-foreground focus-visible:ring-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon className={cn('size-3.5', !sorted && 'opacity-50')} aria-hidden />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                        {FILTER_COLUMNS.has(header.column.id) && (
                          <ColumnFilter
                            kind="feature"
                            field={header.column.id as FeatureFilterField}
                            className="ml-0.5"
                          />
                        )}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="h-11 cursor-pointer"
                // Chuột: bấm cả dòng; bàn phím: link ở cột Tiêu đề
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('a,button'))
                    navigate(`/features/${row.original.code}`, { state: FROM_LIST })
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn('py-2 text-sm', cellVisibility(cell.column.id))}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
