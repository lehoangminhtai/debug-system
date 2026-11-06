import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlatformBadge, SeverityBadge, StatusBadge } from '@/components/common/badges'
import { TruncateTip } from '@/components/common/truncate-tip'
import { UserName } from '@/components/common/user-avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/i18n'
import { cn, formatTs } from '@/lib/utils'
import type { Bug } from '@/types'
import { PAGE_SIZE } from '../hooks/use-bug-filters'
import { FROM_LIST } from '../hooks/use-scope'
import type { FilterField } from '../hooks/use-bug-filters'
import { ColumnFilter } from './bug-filters'

// 768–1279px (bảng nằm cạnh sidebar hoặc trên tablet): ẩn cột phụ để Tiêu đề đủ rộng, không cuộn ngang.
// Nền tảng vẫn lọc được; Ngày tạo vẫn sắp xếp được qua state hiện có.
const WIDE_ONLY = new Set(['platform', 'createdAt'])
/** Cột có bộ lọc ngay tại header */
const FILTER_COLUMNS = new Set<string>(['platform', 'core', 'severity', 'status'])
const cellVisibility = (id: string) => (WIDE_ONLY.has(id) ? 'hidden xl:table-cell' : undefined)

interface Props {
  bugs: Bug[]
  /** Trang hiện tại (0-based) — điều khiển từ thanh công cụ phía trên bảng */
  pageIndex: number
  /** Sắp xếp do server làm — bảng chỉ hiển thị và báo thay đổi */
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
}

export function BugTable({ bugs, pageIndex, sorting, onSortingChange }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<Bug>[]>(() => {
    return [
      {
        id: 'code',
        header: t('field.code'),
        accessorFn: (b) => b.code,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium">{row.original.code}</span>
            {row.original.mustFix && row.original.status !== 'closed' && (
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
        id: 'title',
        header: t('field.title'),
        accessorKey: 'title',
        enableSorting: false,
        cell: ({ row }) => (
          <TruncateTip label={row.original.title}>
            <Link
              to={`/bugs/${row.original.code}`}
              state={FROM_LIST}
              className="focus-visible:ring-ring text-primary hover:text-primary-hover block truncate font-medium underline underline-offset-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {row.original.title}
            </Link>
          </TruncateTip>
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
        id: 'core',
        header: t('field.core'),
        accessorKey: 'isCore',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isCore ? (
            <Check className="text-foreground size-4" aria-label={t('core.yes')} />
          ) : (
            <span className="sr-only">{t('core.no')}</span>
          ),
      },
      {
        id: 'severity',
        header: t('field.severity'),
        accessorFn: (b) => b.severity,
        sortDescFirst: false, // bấm lần đầu: Nghiêm trọng lên trước
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        id: 'status',
        header: t('field.status'),
        accessorFn: (b) => b.status,
        sortDescFirst: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'assignee',
        header: t('field.assignee'),
        accessorFn: (b) => b.assignee ?? '',
        enableSorting: false, // API không sắp xếp theo người sửa
        cell: ({ row }) => (
          <TruncateTip label={row.original.assignee ?? ''}>
            <UserName name={row.original.assignee} fallback={t('table.unassigned')} />
          </TruncateTip>
        ),
      },
      {
        id: 'createdAt',
        header: t('field.createdAt'),
        accessorKey: 'createdAt',
        sortDescFirst: true, // mới nhất trước
        cell: ({ row }) => (
          <TruncateTip label={formatTs(row.original.createdAt)}>
            <time dateTime={row.original.createdAt} className="text-muted-foreground block truncate">
              {formatTs(row.original.createdAt)}
            </time>
          </TruncateTip>
        ),
      },
    ]
  }, [t])

  // Dự án không bật React Compiler; cảnh báo này chỉ áp dụng khi dùng compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: bugs,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize: PAGE_SIZE } },
    manualSorting: true,
    onSortingChange: (u) => onSortingChange(typeof u === 'function' ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* < 768px: danh sách thẻ — cùng row model nên sắp xếp/phân trang đồng bộ với bảng */}
      <ul className="bg-card divide-y rounded-lg border md:hidden" aria-label={t('table.caption')}>
        {table.getRowModel().rows.map(({ original: bug }) => (
          <li key={bug.id}>
            <Link
              to={`/bugs/${bug.code}`}
              state={FROM_LIST}
              className="hover:bg-accent focus-visible:ring-ring flex flex-col gap-1.5 p-3 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-medium">{bug.code}</span>
                {bug.mustFix && bug.status !== 'closed' && (
                  <ShieldAlert
                    className="text-destructive-text size-3.5"
                    role="img"
                    aria-label={t('handling.mustFix')}
                  />
                )}
                <span className="text-muted-foreground ml-auto text-xs">{formatTs(bug.createdAt)}</span>
              </span>
              <span className="line-clamp-2 text-sm font-medium break-words">{bug.title}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={bug.status} />
                <SeverityBadge severity={bug.severity} />
                <PlatformBadge platform={bug.platform} />
                <span className="ml-auto text-xs">
                  <UserName name={bug.assignee} fallback={t('table.unassigned')} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="bg-card hidden flex-1 overflow-x-auto rounded-lg border md:block">
        <Table className="table-fixed xl:min-w-[940px]">
          <caption className="sr-only">{t('table.caption')}</caption>
          <colgroup>
            <col className="w-[92px]" />
            <col />
            <col className="hidden w-[112px] xl:table-column" />
            <col className="w-[72px]" />
            <col className="w-[120px]" />
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
                        {FILTER_COLUMNS.has(header.column.id) && (
                          <ColumnFilter field={header.column.id as FilterField} className="ml-0.5" />
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
                    navigate(`/bugs/${row.original.code}`, { state: FROM_LIST })
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
