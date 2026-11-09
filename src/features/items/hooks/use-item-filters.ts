import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BugQuery } from '@/services/api'
import {
  FEATURE_STATUSES,
  PLATFORMS,
  PRIORITIES,
  SEVERITIES,
  STATUSES,
  type Feature,
  type FeatureStatus,
  type Platform,
  type Priority,
  type Severity,
  type Status,
} from '@/types'

export const PAGE_SIZE = 10

/** Loại mục trong bảng gộp */
export const ITEM_TYPES = ['bug', 'feature'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

/**
 * Tham số lọc trên URL. Bug và đề xuất có bộ giá trị khác nhau nên tách tham số:
 * severity/status/core chỉ áp cho bug, priority/fstatus chỉ áp cho đề xuất.
 */
export const FILTER_PARAMS = ['type', 'platform', 'core', 'severity', 'priority', 'status', 'fstatus'] as const
export type FilterParam = (typeof FILTER_PARAMS)[number]
const BUG_ONLY: FilterParam[] = ['core', 'severity', 'status']
const FEATURE_ONLY: FilterParam[] = ['priority', 'fstatus']

/** Cột / nút lọc trên giao diện; `level` và `status` gom 2 tham số (bug | đề xuất) vào một cột */
export const FILTER_FIELDS = ['type', 'platform', 'core', 'level', 'status'] as const
export type FilterField = (typeof FILTER_FIELDS)[number]
export const FIELD_PARAMS: Record<FilterField, FilterParam[]> = {
  type: ['type'],
  platform: ['platform'],
  core: ['core'],
  level: ['severity', 'priority'],
  status: ['status', 'fstatus'],
}

const pick = <T extends string>(v: string | null, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export function readFilters(params: URLSearchParams) {
  return {
    q: params.get('q') ?? '',
    type: pick<ItemType>(params.get('type'), ITEM_TYPES),
    platform: pick<Platform>(params.get('platform'), PLATFORMS),
    core: pick(params.get('core'), ['yes', 'no'] as const),
    severity: pick<Severity>(params.get('severity'), SEVERITIES),
    priority: pick<Priority>(params.get('priority'), PRIORITIES),
    status: pick<Status>(params.get('status'), STATUSES),
    fstatus: pick<FeatureStatus>(params.get('fstatus'), FEATURE_STATUSES),
  }
}
export type ItemFilters = ReturnType<typeof readFilters>

/** Bộ lọc nằm trên URL để Back/Forward và chia sẻ link giữ nguyên */
export function useItemFilters() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)

  const update = (fn: (next: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        fn(next)
        return next
      },
      { replace: true },
    )

  /** Đặt một tham số. Chọn loại → bỏ các bộ lọc không áp dụng cho loại đó (giữ kết quả nhất quán). */
  const setFilter = (key: FilterParam | 'q', value: string | undefined) =>
    update((next) => {
      if (value) next.set(key, value)
      else next.delete(key)
      if (key === 'type' && value === 'bug') FEATURE_ONLY.forEach((k) => next.delete(k))
      if (key === 'type' && value === 'feature') BUG_ONLY.forEach((k) => next.delete(k))
    })

  /** Đặt giá trị cho một cột gom nhiều tham số: xoá hết tham số của cột rồi đặt tham số được chọn */
  const setField = (field: FilterField, param: FilterParam | undefined, value?: string) =>
    update((next) => {
      FIELD_PARAMS[field].forEach((k) => next.delete(k))
      if (param && value) next.set(param, value)
    })

  const clear = () => update((next) => ['q', ...FILTER_PARAMS].forEach((k) => next.delete(k)))

  /** ignore: tham số không áp dụng ở màn hình hiện tại (Kanban đã chia cột theo trạng thái) */
  const isActive = (ignore: FilterParam[] = []) =>
    !!filters.q.trim() || FILTER_PARAMS.some((k) => !ignore.includes(k) && filters[k])

  return { filters, setFilter, setField, clear, isActive }
}

/** Bộ lọc có loại trừ hẳn bug / đề xuất không (vd. lọc theo "Mức độ mong muốn" thì chỉ còn đề xuất) */
export function scopeOf(f: ItemFilters, ignore: FilterParam[] = []) {
  const on = (k: FilterParam) => !ignore.includes(k) && !!f[k]
  return {
    bugs: f.type !== 'feature' && !FEATURE_ONLY.some(on),
    features: f.type !== 'bug' && !BUG_ONLY.some(on),
  }
}

/** Tham số gửi lên Bug@index — bug lọc/tìm ở server; `q` debounce để không gọi API mỗi phím gõ */
export function useBugQuery(f: ItemFilters, project: string | undefined, ignore: FilterParam[] = []): BugQuery {
  const q = useDebounced(f.q)
  const on = <K extends FilterParam>(k: K) => (ignore.includes(k) ? undefined : f[k])
  return {
    project,
    q,
    platform: on('platform'),
    core: on('core'),
    severity: on('severity'),
    status: on('status'),
  }
}

/** Đề xuất tải hết theo dự án, lọc ở client */
export function matchFeature(f: ItemFilters, item: Feature, ignore: FilterParam[] = []) {
  const on = (k: FilterParam) => !ignore.includes(k) && f[k]
  const q = f.q.trim().toLowerCase()
  return (
    (!q || item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) &&
    (!on('platform') || item.platform.includes(f.platform!)) &&
    (!on('priority') || item.priority === f.priority) &&
    (!on('fstatus') || item.status === f.fstatus)
  )
}
