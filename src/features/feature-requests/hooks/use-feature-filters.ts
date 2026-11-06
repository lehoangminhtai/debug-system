import { useSearchParams } from 'react-router-dom'
import type { FeatureFilterField } from '@/features/bugs/hooks/use-bug-filters'
import { FEATURE_STATUSES, PLATFORMS, PRIORITIES, type Feature } from '@/types'

const pick = <T extends string>(v: string | null, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

/** Bộ lọc trên URL (?q=&platform=&priority=&status=). Lọc ở client vì số đề xuất ít (doc API §2). */
export function useFeatureFilters() {
  const [params] = useSearchParams()
  const filters = {
    q: (params.get('q') ?? '').trim().toLowerCase(),
    platform: pick(params.get('platform'), PLATFORMS),
    priority: pick(params.get('priority'), PRIORITIES),
    status: pick(params.get('status'), FEATURE_STATUSES),
  }
  const on = (f: FeatureFilterField, ignore: FeatureFilterField[]) => !ignore.includes(f) && filters[f]

  const match = (f: Feature, ignore: FeatureFilterField[] = []) =>
    (!filters.q || f.code.toLowerCase().includes(filters.q) || f.title.toLowerCase().includes(filters.q)) &&
    (!on('platform', ignore) || f.platform.includes(filters.platform!)) &&
    (!on('priority', ignore) || f.priority === filters.priority) &&
    (!on('status', ignore) || f.status === filters.status)

  return { filters, match }
}
