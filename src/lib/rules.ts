// Quy tắc nghiệp vụ (spec §2.1, §3.3, §5). Import tương đối để chạy được test bằng node.
import type { Bug, Severity, Status } from '../types/index.ts'
import { SEVERITIES, STATUSES } from '../types/index.ts'

export const PROJECT_KEY_PATTERN = /^[A-Z]{2,4}$/

/** Có ảnh hưởng cốt lõi (bất kỳ mức độ) hoặc Nghiêm trọng → bắt buộc sửa trước release */
export const isMustFix = (bug: Pick<Bug, 'isCore' | 'severity'>) => bug.isCore || bug.severity === 'critical'

/** Bug bắt buộc sửa chưa Đóng → chặn release */
export const isBlocking = (bug: Pick<Bug, 'isCore' | 'severity' | 'status'>) =>
  isMustFix(bug) && bug.status !== 'closed'

export const formatBugCode = (projectKey: string, seq: number) => `${projectKey}-${String(seq).padStart(3, '0')}`

export function releaseStatus<T extends Pick<Bug, 'isCore' | 'severity' | 'status'>>(bugs: T[]) {
  const blocking = bugs.filter(isBlocking)
  return { ready: blocking.length === 0, blocking }
}

export const severityRank = (s: Severity) => SEVERITIES.indexOf(s)
export const statusRank = (s: Status) => STATUSES.indexOf(s)
