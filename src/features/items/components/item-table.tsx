import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FeatureStatusBadge,
  PlatformBadge,
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
  TypeBadge,
} from '@/components/common/badges'
import { TruncateTip } from '@/components/common/truncate-tip'
import { UserName } from '@/components/common/user-avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FROM_LIST } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { cn, formatTs } from '@/lib/utils'
import { FEATURE_STATUSES, PRIORITIES, SEVERITIES, STATUSES, type Bug, type Feature } from '@/types'
import { PAGE_SIZE, type FilterField } from '../hooks/use-item-filters'
import { ColumnFilter } from './item-filters'

/** Một dòng của bảng gộp: bug hoặc đề xuất tính năng */
export type ItemRow = { kind: 'bug'; data: Bug } | { kind: 'feature'; data: Feature }

export const itemHref = (r: ItemRow) => `/${r.kind === 'bug' ? 'bugs' : 'features'}/${r.data.code}`
const isMustFix = (r: ItemRow) => r.kind === 'bug' && r.data.mustFix && r.data.status !== 'closed'

// Mức độ: bug Nghiêm trọng(0) → Thấp(3); đề xuất Cần gấp ~ Cao(1) → Có thì tốt ~ Thấp(3) để sắp xếp chung
const levelRank = (r: ItemRow) =>
  r.kind === 'bug' ? SEVERITIES.indexOf(r.data.severity) : PRIORITIES.indexOf(r.data.priority) + 1
// Trạng thái: theo thứ tự quy trình của từng loại, chia về 0..1 để hai loại xen kẽ hợp lý
const statusRank = (r: ItemRow) =>
  r.kind === 'bug'
    ? STATUSES.indexOf(r.data.status) / (STATUSES.length - 1)
    : FEATURE_STATUSES.indexOf(r.data.status) / (FEATURE_STATUSES.length - 1)

function LevelBadge({ row }: { row: ItemRow }) {
  return row.kind === 'bug' ? (
    <SeverityBadge severity={row.data.severity} />
  ) : (
    <PriorityBadge priority={row.data.priority} />
  )
}
function ItemStatusBadge({ row }: { row: ItemRow }) {
  return row.kind === 'bug' ? <StatusBadge status={row.data.status} /> : <FeatureStatusBadge status={row.data.status} />
}

// 768–1279px (bảng nằm cạnh sidebar hoặc trên tablet): ẩn cột phụ để Tiêu đề đủ rộng, không cuộn ngang.
const WIDE_ONLY = new Set(['platform', 'createdAt'])
/** Cột có bộ lọc ngay tại header */
const FILTER_COLUMNS: Partial<Record<string, FilterField>> = {
  type: 'type',
  platform: 'platform',
  level: 'level',
  status: 'status',
}
const cellVisibility = (id: string) => (WIDE_ONLY.has(id) ? 'hidden xl:table-cell' : undefined)

interface Props {
  rows: ItemRow[]
  pageIndex: number
  /** Sắp xếp ở client (gộp 2 nguồn) */
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
}

export function ItemTable({ rows, pageIndex, sorting, onSortingChange }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<ItemRow>[]>(
    () => [
      {
        id: 'code',
        header: t('field.code'),
        accessorFn: (r) => r.data.code,
        sortingFn: (a, b) => a.original.data.code.localeCompare(b.original.data.code, undefined, { numeric: true }),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium">{row.original.data.code}</span>
            {isMustFix(row.original) && (
              <ShieldAlert
                className="text-destructive-text size-3.5"
                role="img"
                aria-label={t('handling.mustFix')}
                strokeWidth={2.25}
              >
                <title>{t('handling.mustFix')}</title>
              </ShieldAlert>
            )}
          </span>
        ),
      },
      {
        id: 'type',
        header: t('field.type'),
        accessorFn: (r) => r.kind,
        enableSorting: false,
        cell: ({ row }) => <TypeBadge kind={row.original.kind} />,
      },
      {
        id: 'title',
        header: t('field.title'),
        accessorFn: (r) => r.data.title,
        enableSorting: false,
        cell: ({ row }) => (
          <TruncateTip label={row.original.data.title}>
            <Link
              to={itemHref(row.original)}
              state={FROM_LIST}
              className="focus-visible:ring-ring text-primary hover:text-primary-hover block truncate font-medium underline underline-offset-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {row.original.data.title || t('common.untitled')}
            </Link>
          </TruncateTip>
        ),
      },
      {
        id: 'platform',
        header: t('field.platform'),
        accessorFn: (r) => r.data.platform,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1 whitespace-normal">
            <PlatformBadge platform={row.original.data.platform} />
          </span>
        ),
      },
      {
        id: 'level',
        header: t('field.severity'),
        accessorFn: levelRank,
        sortDescFirst: false, // bấm lần đầu: Nghiêm trọng / Cần gấp lên trước
        cell: ({ row }) => <LevelBadge row={row.original} />,
      },
      {
        id: 'status',
        header: t('field.status'),
        accessorFn: statusRank,
        sortDescFirst: false,
        cell: ({ row }) => <ItemStatusBadge row={row.original} />,
      },
      {
        id: 'assignee',
        header: t('field.assignee'),
        accessorFn: (r) => r.data.assignee ?? '',
        enableSorting: false,
        cell: ({ row }) => (
          <TruncateTip label={row.original.data.assignee ?? ''}>
            <UserName name={row.original.data.assignee} fallback={t('table.unassigned')} />
          </TruncateTip>
        ),
      },
      {
        id: 'createdAt',
        header: t('field.createdAt'),
        accessorFn: (r) => r.data.createdAt,
        sortDescFirst: true,
        cell: ({ row }) => (
          <TruncateTip label={formatTs(row.original.data.createdAt)}>
            <time dateTime={row.original.data.createdAt} className="text-muted-foreground block truncate">
              {formatTs(row.original.data.createdAt)}
            </time>
          </TruncateTip>
        ),
      },
    ],
    [t],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (r) => `${r.kind}-${r.data.id}`,
    state: { sorting, pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: (u) => onSortingChange(typeof u === 'function' ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* < 768px: danh sách thẻ — cùng row model nên sắp xếp/phân trang đồng bộ với bảng */}
      <ul className="bg-card divide-y rounded-lg border md:hidden" aria-label={t('table.itemCaption')}>
        {table.getRowModel().rows.map(({ id, original: r }) => (
          <li key={id}>
            <Link
              to={itemHref(r)}
              state={FROM_LIST}
              className="hover:bg-accent focus-visible:ring-ring flex flex-col gap-1.5 p-3 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-medium">{r.data.code}</span>
                {isMustFix(r) && (
                  <ShieldAlert
                    className="text-destructive-text size-3.5"
                    role="img"
                    aria-label={t('handling.mustFix')}
                  />
                )}
                <TypeBadge kind={r.kind} />
                <span className="text-muted-foreground ml-auto text-xs">{formatTs(r.data.createdAt)}</span>
              </span>
              <span className="line-clamp-2 text-sm font-medium break-words">
                {r.data.title || t('common.untitled')}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <ItemStatusBadge row={r} />
                <LevelBadge row={r} />
                <PlatformBadge platform={r.data.platform} />
                <span className="ml-auto text-xs">
                  <UserName name={r.data.assignee} fallback={t('table.unassigned')} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="bg-card hidden flex-1 overflow-x-auto rounded-lg border md:block">
        <Table className="table-fixed xl:min-w-[1000px]">
          <caption className="sr-only">{t('table.itemCaption')}</caption>
          <colgroup>
            <col className="w-[104px]" />
            <col className="w-[168px]" />
            <col />
            <col className="hidden w-[112px] xl:table-column" />
            <col className="w-[128px]" />
            <col className="w-[132px]" />
            <col className="w-[150px]" />
            <col className="hidden w-[156px] xl:table-column" />
          </colgroup>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                  const filter = FILTER_COLUMNS[header.column.id]
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn(
                        'text-muted-foreground h-9 px-1.5 text-xs font-medium',
                        cellVisibility(header.column.id),
                      )}
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
                        {filter && <ColumnFilter field={filter} className="ml-0.5" />}
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
                    navigate(itemHref(row.original), { state: FROM_LIST })
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn('px-1.5 py-2 text-sm', cellVisibility(cell.column.id))}>
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
