import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BugQuery } from '@/services/api'
import { PLATFORMS, SEVERITIES, STATUSES, type Platform, type Severity, type Status } from '@/types'

export const PAGE_SIZE = 10

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export const FILTER_FIELDS = ['platform', 'core', 'severity', 'status'] as const
export type FilterField = (typeof FILTER_FIELDS)[number]
/** Bộ lọc của trang Tính năng mong muốn (cùng tham số URL, giá trị trạng thái khác) */
export const FEATURE_FILTER_FIELDS = ['platform', 'priority', 'status'] as const
export type FeatureFilterField = (typeof FEATURE_FILTER_FIELDS)[number]
type FilterKey = 'q' | FilterField | FeatureFilterField

const pick = <T extends string>(v: string | null, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

/** Bộ lọc nằm trên URL (?q=&platform=&core=&severity=&status=) để Back/Forward và chia sẻ link giữ nguyên */
export function useBugFilters() {
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    platform: pick<Platform>(params.get('platform'), PLATFORMS),
    core: pick(params.get('core'), ['yes', 'no'] as const),
    severity: pick<Severity>(params.get('severity'), SEVERITIES),
    status: pick<Status>(params.get('status'), STATUSES),
  }

  const update = (fn: (next: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        fn(next)
        return next
      },
      { replace: true },
    )

  const setFilter = (key: FilterKey, value: string | undefined) =>
    update((next) => (value ? next.set(key, value) : next.delete(key)))

  const clear = () => update((next) => ['q', ...FILTER_FIELDS, 'priority'].forEach((k) => next.delete(k)))

  /** ignore: các field không áp dụng ở màn hình hiện tại (Kanban đã chia cột theo trạng thái) */
  const isActive = (ignore: FilterField[] = []) =>
    !!filters.q || FILTER_FIELDS.some((f) => !ignore.includes(f) && filters[f])

  /** Tham số gửi lên Bug@index — lọc/tìm kiếm do server làm; `q` được debounce để không gọi API mỗi phím gõ */
  const useQuery = (
    project: string | undefined,
    ignore: FilterField[] = [],
    sort?: Pick<BugQuery, 'sortBy' | 'sortDir'>,
  ) => {
    const q = useDebounced(filters.q)
    const on = (f: FilterField) => (ignore.includes(f) ? undefined : filters[f])
    return {
      project,
      q,
      platform: on('platform') as Platform | undefined,
      core: on('core') as 'yes' | 'no' | undefined,
      severity: on('severity') as Severity | undefined,
      status: on('status') as Status | undefined,
      ...sort,
    } satisfies BugQuery
  }

  return { filters, setFilter, clear, isActive, useQuery }
}
