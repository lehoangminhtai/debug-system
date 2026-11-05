import { useSearchParams } from 'react-router-dom'
import { PLATFORMS, SEVERITIES, STATUSES, type Bug, type Platform, type Severity, type Status } from '@/types'

export const PAGE_SIZE = 10

export const FILTER_FIELDS = ['platform', 'core', 'severity', 'status'] as const
export type FilterField = (typeof FILTER_FIELDS)[number]
type FilterKey = 'q' | FilterField

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

  const clear = () => update((next) => (['q', ...FILTER_FIELDS] as const).forEach((k) => next.delete(k)))

  /** ignore: các field không áp dụng ở màn hình hiện tại (Kanban đã chia cột theo trạng thái) */
  const apply = (bugs: Bug[], ignore: FilterField[] = []) => {
    const q = filters.q.trim().toLowerCase()
    const on = (f: FilterField) => !ignore.includes(f) && filters[f]
    return bugs.filter(
      (b) =>
        (!q || b.code.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)) &&
        (!on('platform') || b.platform === filters.platform) &&
        (!on('core') || b.isCore === (filters.core === 'yes')) &&
        (!on('severity') || b.severity === filters.severity) &&
        (!on('status') || b.status === filters.status),
    )
  }

  const isActive = (ignore: FilterField[] = []) =>
    !!filters.q || FILTER_FIELDS.some((f) => !ignore.includes(f) && filters[f])

  return { filters, setFilter, clear, apply, isActive }
}
