import { ListFilter, Search, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'react-router-dom'
import { FEATURE_STATUSES, PLATFORMS, PRIORITIES, SEVERITIES, STATUSES } from '@/types'
import { useBugFilters, type FeatureFilterField, type FilterField } from '../hooks/use-bug-filters'

const ALL = '__all'

/** bug: trang bug · feature: trang Tính năng mong muốn */
export type FilterKind = 'bug' | 'feature'
type FieldDef = { label: string; all: string; options: { value: string; label: string }[] }

function useFilterFields(kind: FilterKind): Record<string, FieldDef> {
  const { t } = useI18n()
  const platform = {
    label: t('field.platform'),
    all: t('filter.allPlatforms'),
    options: PLATFORMS.map((v) => ({ value: v, label: t(`platform.${v}`) })),
  }
  if (kind === 'feature')
    return {
      platform,
      priority: {
        label: t('field.priority'),
        all: t('filter.allPriorities'),
        options: PRIORITIES.map((v) => ({ value: v, label: t(`priority.${v}`) })),
      },
      status: {
        label: t('field.status'),
        all: t('filter.allStatuses'),
        options: FEATURE_STATUSES.map((v) => ({ value: v, label: t(`featureStatus.${v}`) })),
      },
    } satisfies Record<FeatureFilterField, FieldDef>
  return {
    platform,
    core: {
      label: t('field.core'),
      all: t('filter.allCore'),
      options: [
        { value: 'yes', label: t('filter.coreOnly') },
        { value: 'no', label: t('filter.nonCore') },
      ],
    },
    severity: {
      label: t('field.severity'),
      all: t('filter.allSeverities'),
      options: SEVERITIES.map((v) => ({ value: v, label: t(`severity.${v}`) })),
    },
    status: {
      label: t('field.status'),
      all: t('filter.allStatuses'),
      options: STATUSES.map((v) => ({ value: v, label: t(`status.${v}`) })),
    },
  } satisfies Record<FilterField, FieldDef>
}

/** Giá trị lọc đang chọn, đọc thẳng từ URL; giá trị không thuộc danh sách → coi như không lọc */
function useCurrent(field: string, def?: FieldDef) {
  const [params] = useSearchParams()
  return def?.options.find((o) => o.value === params.get(field))
}

/**
 * Bộ lọc theo cột. `header`: nút icon trong header bảng; `toolbar`: nút có chữ — dùng khi cột không hiển thị
 * (mobile, cột bị ẩn ở màn hình hẹp) hoặc ở Kanban. Đang lọc → tô xanh.
 */
export function ColumnFilter({
  field,
  kind = 'bug',
  variant = 'header',
  className,
}: {
  field: FilterField | FeatureFilterField
  kind?: FilterKind
  variant?: 'header' | 'toolbar'
  className?: string
}) {
  const { t } = useI18n()
  const def = useFilterFields(kind)[field]
  const { setFilter } = useBugFilters()
  const current = useCurrent(field, def)
  const value = current?.value
  const label = t('filter.by', { col: def.label })

  const trigger =
    variant === 'header' ? (
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={current ? `${label}: ${current.label}` : label}
        className={cn(
          'size-6',
          current
            ? 'bg-primary-light text-primary-hover hover:bg-primary-light hover:text-primary-hover'
            : 'text-muted-foreground',
          className,
        )}
      >
        <ListFilter className="size-3.5" />
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          current && 'border-primary/40 bg-primary-light text-primary-hover hover:bg-primary-light',
          className,
        )}
      >
        <ListFilter aria-hidden />
        {def.label}
        {current && <span className="font-semibold">: {current.label}</span>}
      </Button>
    )

  return (
    <DropdownMenu>
      {variant === 'header' ? (
        <Hint label={label}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        </Hint>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuLabel className="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value ?? ALL} onValueChange={(v) => setFilter(field, v === ALL ? undefined : v)}>
          <DropdownMenuRadioItem value={ALL}>{def.all}</DropdownMenuRadioItem>
          {def.options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SearchBox() {
  const { t } = useI18n()
  const { filters, setFilter } = useBugFilters()
  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        value={filters.q}
        onChange={(e) => setFilter('q', e.target.value)}
        placeholder={t('filter.search')}
        aria-label={t('filter.search')}
        className="h-8 pl-8"
      />
    </div>
  )
}

/** Chip các filter đang áp dụng, mỗi chip xóa được; nhiều filter → thêm "Xóa bộ lọc" */
export function ActiveFilters({
  fields,
  kind = 'bug',
}: {
  fields: readonly (FilterField | FeatureFilterField)[]
  kind?: FilterKind
}) {
  const { t } = useI18n()
  const defs = useFilterFields(kind)
  const [params] = useSearchParams()
  const { setFilter, clear } = useBugFilters()
  const label = (f: string) => defs[f].options.find((o) => o.value === params.get(f))?.label
  const active = fields.filter((f) => label(f))
  if (!active.length) return null
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label={t('filter.label')}>
      {active.map((f) => {
        const def = defs[f]
        return (
          <li
            key={f}
            className="border-primary/30 bg-primary-light text-primary-hover inline-flex h-7 items-center gap-1 rounded-md border pr-0.5 pl-2 text-xs"
          >
            {def.label}: <span className="font-semibold">{label(f)}</span>
            <button
              type="button"
              aria-label={t('filter.remove', { col: def.label })}
              onClick={() => setFilter(f, undefined)}
              className="focus-visible:ring-ring hover:bg-primary/10 inline-flex size-6 items-center justify-center rounded-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        )
      })}
      {active.length > 1 && (
        <li>
          <Button variant="ghost" size="sm" className="h-7" onClick={clear}>
            {t('action.clearFilters')}
          </Button>
        </li>
      )}
    </ul>
  )
}

export function ResultCount({ n, kind = 'bug' }: { n?: number; kind?: FilterKind }) {
  const { t } = useI18n()
  if (n === undefined) return null
  return (
    <p className="text-muted-foreground ml-auto text-sm tabular-nums" aria-live="polite">
      {t(kind === 'bug' ? 'filter.results' : 'filter.featureResults', { n })}
    </p>
  )
}
