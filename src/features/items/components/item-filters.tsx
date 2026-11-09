import { ListFilter, Search, X } from 'lucide-react'
import { Fragment } from 'react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { FEATURE_STATUSES, PLATFORMS, PRIORITIES, SEVERITIES, STATUSES } from '@/types'
import {
  FIELD_PARAMS,
  useItemFilters,
  type FilterField,
  type FilterParam,
  type ItemFilters,
} from '../hooks/use-item-filters'

const ALL = '__all'

type Option = { param: FilterParam; value: string; label: string }
/** `kind`: nhóm chỉ áp cho bug / đề xuất — ẩn khi đang lọc loại còn lại */
type Group = { label?: string; kind?: 'bug' | 'feature'; options: Option[] }
type FieldDef = { label: string; all: string; groups: Group[] }

function useFieldDefs(): Record<FilterField, FieldDef> {
  const { t } = useI18n()
  const opts = (param: FilterParam, values: readonly string[], label: (v: string) => string) =>
    values.map((value) => ({ param, value, label: label(value) }))
  return {
    type: {
      label: t('field.type'),
      all: t('filter.allTypes'),
      groups: [{ options: opts('type', ['bug', 'feature'], (v) => t(v === 'bug' ? 'type.bug' : 'type.feature')) }],
    },
    platform: {
      label: t('field.platform'),
      all: t('filter.allPlatforms'),
      groups: [{ options: opts('platform', PLATFORMS, (v) => t(`platform.${v as (typeof PLATFORMS)[number]}`)) }],
    },
    core: {
      label: t('field.core'),
      all: t('filter.allCore'),
      groups: [
        {
          kind: 'bug',
          options: [
            { param: 'core', value: 'yes', label: t('filter.coreOnly') },
            { param: 'core', value: 'no', label: t('filter.nonCore') },
          ],
        },
      ],
    },
    level: {
      label: t('field.severity'),
      all: t('filter.allSeverities'),
      groups: [
        {
          label: `${t('filter.bugGroup')} · ${t('field.severity')}`,
          kind: 'bug',
          options: opts('severity', SEVERITIES, (v) => t(`severity.${v as (typeof SEVERITIES)[number]}`)),
        },
        {
          label: `${t('filter.featureGroup')} · ${t('field.priority')}`,
          kind: 'feature',
          options: opts('priority', PRIORITIES, (v) => t(`priority.${v as (typeof PRIORITIES)[number]}`)),
        },
      ],
    },
    status: {
      label: t('field.status'),
      all: t('filter.allStatuses'),
      groups: [
        {
          label: t('filter.bugGroup'),
          kind: 'bug',
          options: opts('status', STATUSES, (v) => t(`status.${v as (typeof STATUSES)[number]}`)),
        },
        {
          label: t('filter.featureGroup'),
          kind: 'feature',
          options: opts('fstatus', FEATURE_STATUSES, (v) =>
            t(`featureStatus.${v as (typeof FEATURE_STATUSES)[number]}`),
          ),
        },
      ],
    },
  }
}

/** Nhóm còn áp dụng với loại đang lọc */
const visibleGroups = (def: FieldDef, filters: ItemFilters) =>
  def.groups.filter((g) => !g.kind || !filters.type || g.kind === filters.type)

/** Lựa chọn đang áp dụng của một cột (đọc thẳng từ URL) */
function currentOf(def: FieldDef, field: FilterField, filters: ItemFilters) {
  for (const param of FIELD_PARAMS[field]) {
    const v = filters[param]
    if (v) return def.groups.flatMap((g) => g.options).find((o) => o.param === param && o.value === v)
  }
}

/**
 * Bộ lọc theo cột. `header`: nút icon trong header bảng; `toolbar`: nút có chữ — dùng khi cột không hiển thị
 * (mobile, màn hẹp) hoặc ở Kanban. Đang lọc → tô xanh.
 */
export function ColumnFilter({
  field,
  variant = 'header',
  className,
  /** Kanban: chỉ hiện nhóm của loại đang xem, không cho chọn "tất cả" ở cột Loại */
  only,
}: {
  field: FilterField
  variant?: 'header' | 'toolbar'
  className?: string
  only?: 'bug' | 'feature'
}) {
  const { t } = useI18n()
  const def = useFieldDefs()[field]
  const { filters, setField, setFilter } = useItemFilters()
  const current = currentOf(def, field, filters)
  const label = t('filter.by', { col: def.label })
  const groups = visibleGroups(def, only ? { ...filters, type: only } : filters)
  if (!groups.length) return null

  const onValueChange = (v: string) => {
    if (v === ALL) return setField(field, undefined)
    const [param, value] = v.split(':') as [FilterParam, string]
    if (field === 'type') setFilter('type', value)
    else setField(field, param, value)
  }

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
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel className="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current ? `${current.param}:${current.value}` : ALL}
          onValueChange={onValueChange}
        >
          <DropdownMenuRadioItem value={ALL}>{def.all}</DropdownMenuRadioItem>
          {groups.map((g, i) => (
            <Fragment key={i}>
              {g.label && groups.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">{g.label}</DropdownMenuLabel>
                </>
              )}
              {g.options.map((o) => (
                <DropdownMenuRadioItem key={`${o.param}:${o.value}`} value={`${o.param}:${o.value}`}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SearchBox() {
  const { t } = useI18n()
  const { filters, setFilter } = useItemFilters()
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
export function ActiveFilters({ fields }: { fields: readonly FilterField[] }) {
  const { t } = useI18n()
  const defs = useFieldDefs()
  const { filters, setField, clear } = useItemFilters()
  const active = fields
    .map((f) => ({ field: f, def: defs[f], current: currentOf(defs[f], f, filters) }))
    .filter((a) => a.current)
  if (!active.length) return null
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label={t('filter.label')}>
      {active.map(({ field, def, current }) => (
        <li
          key={field}
          className="border-primary/30 bg-primary-light text-primary-hover inline-flex h-7 items-center gap-1 rounded-md border pr-0.5 pl-2 text-xs"
        >
          {def.label}: <span className="font-semibold">{current!.label}</span>
          <button
            type="button"
            aria-label={t('filter.remove', { col: def.label })}
            onClick={() => setField(field, undefined)}
            className="focus-visible:ring-ring hover:bg-primary/10 inline-flex size-6 items-center justify-center rounded-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
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

export function ResultCount({ n, kind = 'item' }: { n?: number; kind?: 'item' | 'bug' | 'feature' }) {
  const { t } = useI18n()
  if (n === undefined) return null
  const key = kind === 'bug' ? 'filter.results' : kind === 'feature' ? 'filter.featureResults' : 'filter.itemResults'
  return (
    <p className="text-muted-foreground ml-auto text-sm tabular-nums" aria-live="polite">
      {t(key, { n })}
    </p>
  )
}
