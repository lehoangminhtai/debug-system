import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
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
import { CommentBadge } from '@/components/common/comment-badge'
import { TruncateTip } from '@/components/common/truncate-tip'
import { UserName } from '@/components/common/user-avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FROM_LIST } from '@/features/bugs/hooks/use-scope'
import { useI18n } from '@/i18n'
import { cn, formatTs } from '@/lib/utils'
import type { ItemRow } from '@/types'
import type { FilterField } from '../hooks/use-item-filters'
import { ColumnFilter } from './item-filters'

const itemHref = (r: ItemRow) => `/${r.kind === 'bug' ? 'bugs' : 'features'}/${r.data.code}`
/** Bug bắt buộc sửa chưa Đóng (server tính `blocksRelease`) */
const blocksRelease = (r: ItemRow) => r.kind === 'bug' && r.data.blocksRelease

function LevelBadge({ row }: { row: ItemRow }) {
  return row.kind === 'bug' ? (
    <SeverityBadge severity={row.data.severity} />
  ) : (
    <PriorityBadge priority={row.data.priority} />
  )
}
function ItemComments({ row }: { row: ItemRow }) {
  return <CommentBadge kind={row.kind} code={row.data.code} count={row.data.commentCount} last={row.data.lastComment} />
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
  /** Một trang đã lọc + sắp xếp ở server (Item@index) */
  rows: ItemRow[]
  /** Chỉ là trạng thái nút sắp xếp — gửi lên server, bảng không tự sắp */
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
}

export function ItemTable({ rows, sorting, onSortingChange }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<ItemRow>[]>(
    () => [
      {
        id: 'code',
        header: t('field.code'),
        accessorFn: (r) => r.data.code,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium">{row.original.data.code}</span>
            {blocksRelease(row.original) && (
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
          <span className="flex min-w-0 items-center gap-2">
            <TruncateTip label={row.original.data.title}>
              <Link
                to={itemHref(row.original)}
                state={FROM_LIST}
                className="focus-visible:ring-ring text-primary hover:text-primary-hover block min-w-0 truncate font-medium underline underline-offset-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                {row.original.data.title || t('common.untitled')}
              </Link>
            </TruncateTip>
            <ItemComments row={row.original} />
          </span>
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
        accessorFn: (r) => (r.kind === 'bug' ? r.data.severity : r.data.priority),
        sortDescFirst: false, // bấm lần đầu: Nghiêm trọng / Cần gấp lên trước
        cell: ({ row }) => <LevelBadge row={row.original} />,
      },
      {
        id: 'status',
        header: t('field.status'),
        accessorFn: (r) => r.data.status,
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
    state: { sorting },
    manualSorting: true, // server sắp xếp + phân trang (Item@index)
    onSortingChange: (u) => onSortingChange(typeof u === 'function' ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* < 768px: danh sách thẻ — cùng trang dữ liệu với bảng */}
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
                {blocksRelease(r) && (
                  <ShieldAlert
                    className="text-destructive-text size-3.5"
                    role="img"
                    aria-label={t('handling.mustFix')}
                  />
                )}
                <TypeBadge kind={r.kind} />
                <span className="text-muted-foreground ml-auto text-xs">{formatTs(r.data.createdAt)}</span>
              </span>
              <span className="flex items-start gap-2">
                <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium break-words">
                  {r.data.title || t('common.untitled')}
                </span>
                <ItemComments row={r} />
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
