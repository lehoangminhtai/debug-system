export const PLATFORMS = ['backend', 'frontend', 'mobile', 'windows'] as const
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
  /** Số bug bắt buộc sửa chưa đóng (backend tính) */
  mustFixOpen: number
  /** Số thứ tự đề xuất tính năng kế tiếp (FF-F004) */
  nextFeatureSeq: number
  /** Số đề xuất tính năng đang `new` — hiện trên sidebar. Backend cũ chưa trả → FE tự đếm (ProjectNav) */
  newFeatureCount?: number
}

export interface BugImage {
  id: number
  /** Backend cũ chưa trả → coi là ảnh */
  type: 'image' | 'video'
  url: string
  caption: string
  /** Byte (0 nếu không rõ) */
  size: number
}

/** File minh chứng khi lưu bug: giữ file cũ theo `url`, hoặc file mới (ảnh/video) */
export type BugMediaInput = { url: string; caption: string } | { file: Blob; name: string; caption: string }

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
  platform: Platform[]
  isCore: boolean
  severity: Severity
  /** isCore || severity === 'critical' (backend tính) */
  mustFix: boolean
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
  platform: Platform[]
  /** Không gửi = backend mặc định (tạo mới) / giữ nguyên (sửa) */
  isCore?: boolean
  severity?: Severity
  steps: string
  expected: string
  actual: string
  note: string
  reporter: string
  assignee: string | null
  /** Danh sách đầy đủ sau khi sửa ([] = xoá hết) */
  images: BugMediaInput[]
}

export interface ProjectInput {
  key: string
  name: string
  description: string
}

// ── Tính năng mong muốn (doc/feature-request-spec.md) ──
export const PRIORITIES = ['high', 'medium', 'low'] as const
export const FEATURE_STATUSES = ['new', 'accepted', 'in_progress', 'done', 'rejected'] as const

export type Priority = (typeof PRIORITIES)[number]
export type FeatureStatus = (typeof FEATURE_STATUSES)[number]

export interface FeatureMedia {
  id: number
  type: 'image' | 'video'
  url: string
  caption: string
  size: number
}

export interface FeatureHistory {
  id: number
  status: FeatureStatus
  who: string
  action: HistoryAction
  /** assign: người được giao · status: trạng thái trước đó */
  target?: string
  createdAt: string
}

export interface Feature {
  id: number
  projectId: number
  seq: number
  code: string
  title: string
  /** Một hoặc nhiều nền tảng (API: `platforms`) */
  platform: Platform[]
  current: string
  desired: string
  benefit: string
  priority: Priority
  status: FeatureStatus
  rejectReason: string | null
  requester: string
  assignee: string | null
  createdAt: string
  media: FeatureMedia[]
  history: FeatureHistory[]
}

/** File minh hoạ khi lưu: giữ file cũ theo `id`, hoặc file mới */
export type MediaInput = { id: number; caption: string } | { file: Blob; name: string; caption: string }

export interface FeatureInput {
  projectId?: number
  title: string
  /** Một hoặc nhiều nền tảng (API: `platforms`) */
  platform: Platform[]
  current: string
  desired: string
  benefit: string
  priority?: Priority
  requester: string
  assignee: string | null
  /** Danh sách đầy đủ sau khi sửa ([] = xoá hết) */
  media: MediaInput[]
}
