export const PLATFORMS = ['backend', 'frontend', 'mobile'] as const
export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export const STATUSES = ['new', 'fixing', 'fixed', 'closed'] as const

export type Platform = (typeof PLATFORMS)[number]
export type Severity = (typeof SEVERITIES)[number]
export type Status = (typeof STATUSES)[number]

export interface Project {
  id: number
  key: string
  name: string
  /** Mô tả, ghi rõ tính năng cốt lõi của dự án */
  description: string
  /** Số thứ tự kế tiếp — chỉ tăng, không dùng lại khi xóa bug */
  nextSeq: number
}

export interface BugImage {
  id: number
  url: string
  caption: string
}

/** Lưu dạng mã + tham số để dịch được khi hiển thị (spec §2.2: dịch cả lịch sử) */
export type HistoryAction = 'create' | 'claim' | 'assign' | 'unassign' | 'status' | 'edit'

export interface BugHistory {
  id: number
  /** Trạng thái sau khi đổi */
  status: Status
  who: string
  action: HistoryAction
  /** Người được giao (assign) hoặc trạng thái trước đó (status) */
  target?: string
  createdAt: string
}

export interface Bug {
  id: number
  projectId: number
  seq: number
  code: string
  title: string
  platform: Platform
  isCore: boolean
  severity: Severity
  /** Mỗi dòng một bước */
  steps: string
  expected: string
  actual: string
  note: string
  reporter: string
  assignee: string | null
  status: Status
  createdAt: string
  images: BugImage[]
  history: BugHistory[]
}

export interface BugInput {
  projectId: number
  title: string
  platform: Platform
  isCore: boolean
  severity: Severity
  steps: string
  expected: string
  actual: string
  note: string
  reporter: string
  assignee: string | null
  images: Omit<BugImage, 'id'>[]
}

export interface ProjectInput {
  key: string
  name: string
  description: string
}
