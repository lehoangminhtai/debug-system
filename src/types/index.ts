export const PLATFORMS = ['backend', 'frontend', 'mobile', 'windows'] as const
export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export const STATUSES = ['new', 'fixing', 'fixed', 'closed'] as const

/** Bộ lọc nhanh "Của tôi": được giao · tôi báo/tạo · tôi đã bình luận (server lọc, `?mine=`) */
export const MINE = ['assigned', 'reported', 'commented'] as const
export type Mine = (typeof MINE)[number]

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

/** File mới chèn vào nội dung rich text, gửi kèm khi lưu (multipart `files[N]`, trong HTML là `upload:N`) */
export interface UploadFile {
  blob: Blob
  name: string
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
  platform: Platform[]
  isCore: boolean
  severity: Severity
  /** isCore || severity === 'critical' (backend tính) */
  mustFix: boolean
  /** mustFix và chưa Đóng → đang chặn release (backend tính) */
  blocksRelease: boolean
  /** Rich text HTML: bước tái tạo, kết quả, ảnh/video/tệp đính kèm */
  content: string
  reporter: string
  assignee: string | null
  status: Status
  createdAt: string
  history: BugHistory[]
  /** Chỉ có ở chi tiết (show), danh sách không kèm */
  comments?: Comment[]
  /** Có cả ở danh sách: hiện 💬 N và chấm "mới" */
  commentCount: number
  lastComment: LastComment | null
}

/** Bình luận mới nhất (tóm tắt trong danh sách / Kanban) */
export interface LastComment {
  author: string
  createdAt: string
  /** Người đang đăng nhập viết → không tính là "mới" */
  mine: boolean
}

/** Bình luận của bug / đề xuất tính năng */
export interface Comment {
  id: number
  /** Rich text HTML (cùng dạng `content` của bug) */
  content: string
  author: string
  authorId: string | null
  createdAt: string
  updatedAt: string
  /** Người đang đăng nhập là tác giả → được sửa/xoá (backend tính) */
  mine: boolean
}

export type CommentKind = 'bug' | 'feature'

/** Nội dung rich text gửi lên: HTML (file mới là `upload:N`) + file theo N */
export interface RichInput {
  content: string
  files: UploadFile[]
}

export interface BugInput {
  projectId: number
  title: string
  platform: Platform[]
  /** Không gửi = backend mặc định (tạo mới) / giữ nguyên (sửa) */
  isCore?: boolean
  severity?: Severity
  /** HTML; file mới trỏ bằng `upload:N` ứng với `files[N]`. File cũ bỏ khỏi HTML = xoá */
  content: string
  files: UploadFile[]
  reporter: string
  assignee: string | null
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
  /** Rich text HTML: hiện tại, mong muốn, lợi ích, ảnh/video/tệp đính kèm */
  content: string
  priority: Priority
  status: FeatureStatus
  rejectReason: string | null
  requester: string
  assignee: string | null
  createdAt: string
  history: FeatureHistory[]
  /** Chỉ có ở chi tiết (show), danh sách không kèm */
  comments?: Comment[]
  commentCount: number
  lastComment: LastComment | null
}

/** Một dòng của bảng gộp (Item@index): bug hoặc đề xuất tính năng */
export type ItemRow = { kind: 'bug'; data: Bug } | { kind: 'feature'; data: Feature }

export interface FeatureInput {
  projectId?: number
  title: string
  /** Một hoặc nhiều nền tảng (API: `platforms`) */
  platform: Platform[]
  /** HTML; file mới trỏ bằng `upload:N` ứng với `files[N]`. File cũ bỏ khỏi HTML = xoá */
  content: string
  files: UploadFile[]
  priority?: Priority
  requester: string
  assignee: string | null
}
