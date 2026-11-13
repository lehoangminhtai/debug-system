// Gọi backend thật (doc/debugging-system-api.md). Chữ ký hàm giữ nguyên như bản mock, chỉ bỏ tham số `who` (backend lấy từ token).
import type {
  Bug,
  BugInput,
  Feature,
  FeatureInput,
  FeatureStatus,
  ItemRow,
  Mine,
  Platform,
  Priority,
  Project,
  ProjectInput,
  Comment,
  CommentKind,
  RichInput,
  Severity,
  Status,
  UploadFile,
} from '../types/index.ts'
import { createPersistedStore } from '../lib/persisted-store.ts'

// URL backend theo môi trường (.env.development / .env.staging / .env.production — xem README "Môi trường").
// Staging/production: đường dẫn TƯƠNG ĐỐI ('/dts/backend/') → tự cùng giao thức + host với trang,
// chạy được cả http lẫn https. URL tuyệt đối (local) bị ép theo giao thức của trang để trang https
// không bao giờ gọi API http (mixed content) — giống App VCM.
const RAW_API_BASE: string = import.meta.env.VITE_API_BASE_URL
const API_BASE = RAW_API_BASE.replace(/^https?:\/\//, `${window.location.protocol}//`)

/** Host thật của backend — cũng là nơi phục vụ thư mục upload (ảnh/video). */
const FILE_ORIGIN = new URL(API_BASE, window.location.href).origin

/** `code` lấy từ backend (not_found, duplicate_key, invalid_key, invalid_credentials...) hoặc nội bộ (network, session_expired, generic) */
export class ApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

// Token đăng nhập. Hết hạn thì backend trả 401 → xóa token → router đưa về /login.
const tokenStore = createPersistedStore<string>('debugs.token', '', (v): v is string => typeof v === 'string')
export const useSession = tokenStore.use
export const setToken = tokenStore.set

type Options = { method?: 'GET' | 'POST'; query?: Record<string, string | undefined>; body?: unknown }

async function request<T>(c: string, m: string, { method = 'GET', query = {}, body }: Options = {}): Promise<T> {
  const params = new URLSearchParams({ c, m })
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)

  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData: để trình duyệt tự đặt Content-Type kèm boundary
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}?${params}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network')
  }
  const json = await res.json().catch(() => null)

  // Đăng nhập đi qua login() riêng nên 401 ở đây là mất phiên, 403 no_access là bị gỡ quyền vào DTS
  if ((res.status === 401 && m !== 'login') || json?.code === 'no_access') {
    tokenStore.set('')
    throw new ApiError(res.status === 401 ? 'session_expired' : 'no_access')
  }
  if (!res.ok || json?.success === false)
    throw new ApiError(json?.code ?? (res.status === 413 ? 'payload_too_large' : 'generic'))
  return json as T
}

export async function login(username: string, password: string, otp?: string) {
  const json = await request<{ accessToken: string }>('Auth', 'login', {
    method: 'POST',
    body: { username, password, otp: otp || null },
  })
  tokenStore.set(json.accessToken)
}

// Trong `content`, backend trả link file dạng tương đối theo môi trường ('/dts/upload/...' ở production,
// '/web_develop/dts/upload/...' ở staging): ghép FILE_ORIGIN để <img>/<video> chạy được cả khi dev
// (backend ở host khác). Khi gửi lại (sửa) phải trả về đúng nguyên văn nên cắt origin đi.
// `="/x` nhưng không phải `="//host` (URL không giao thức).
const contentIn = (html: string | null | undefined) =>
  (html ?? '').replace(/\b(src|href)="\/(?!\/)/g, `$1="${FILE_ORIGIN}/`)
const contentOut = (html: string) => html.replaceAll(`="${FILE_ORIGIN}/`, '="/')

/** `content` (HTML, file mới là `upload:N`) + `files[N]` */
function appendContent(fd: FormData, content: string, files: UploadFile[]) {
  fd.append('content', contentOut(content))
  files.forEach((f, i) => fd.append(`files[${i}]`, f.blob, f.name))
}

const commentsIn = (comments?: Comment[]) => comments?.map((c) => ({ ...c, content: contentIn(c.content) }))

/** `platforms` (mảng) hoặc `platform` (chuỗi/mảng) của backend cũ → mảng; giá trị cũ 'window' → 'windows' */
const platformsIn = (v: Platform | Platform[]) =>
  [v].flat().map((p) => ((p as string) === 'window' ? 'windows' : p)) as Platform[]

// Backend dùng `platforms` (mảng); FE giữ tên `platform` nội bộ.
const bugIn = (b: Bug & { platforms?: Platform[] }): Bug => {
  const { platforms, ...rest } = b
  return {
    ...rest,
    platform: platformsIn(platforms ?? rest.platform),
    content: contentIn(b.content),
    history: b.history.map((h) => ({ ...h, target: h.target ?? undefined })),
    comments: commentsIn(b.comments),
  }
}

/** multipart/form-data cho Bug@store/update: nội dung rich text + file mới gửi nguyên Blob */
function bugForm(
  { platform, isCore, content, files, ...fields }: Partial<BugInput> & Omit<BugInput, 'projectId'>,
  otp: string,
) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v === null ? '' : String(v))
  if (isCore !== undefined) fd.append('isCore', isCore ? '1' : '0') // Laravel `boolean` không nhận chuỗi "true"
  for (const p of platform) fd.append('platforms[]', p)
  appendContent(fd, content, files)
  fd.append('otp', otp)
  return fd
}

// Giống bug: backend dùng `platforms` (mảng), FE giữ tên `platform`; nhận cả `platform` chuỗi từ backend cũ
const featureIn = ({ platforms, ...f }: Feature & { platforms?: Platform[] }): Feature => ({
  ...f,
  platform: platformsIn(platforms ?? f.platform),
  content: contentIn(f.content),
  history: f.history.map((h) => ({ ...h, target: h.target ?? undefined })),
  comments: commentsIn(f.comments),
})

/**
 * Bình luận (Bug|Feature@addComment/updateComment/deleteComment). Không cần OTP.
 * Backend trả lại cả bug/đề xuất kèm `comments` → dùng thẳng làm cache chi tiết.
 */
async function commentRequest(kind: CommentKind, m: string, code: string, id?: number, input?: RichInput) {
  const fd = new FormData()
  if (input) appendContent(fd, input.content, input.files)
  const query = { code, id: id ? String(id) : undefined }
  if (kind === 'bug') return bugIn((await request<{ data: Bug }>('Bug', m, { method: 'POST', query, body: fd })).data)
  return featureIn((await request<{ data: Feature }>('Feature', m, { method: 'POST', query, body: fd })).data)
}

/** multipart/form-data cho Feature@store/update (doc feature-request-api §12) */
function featureForm({ platform, content, files, ...fields }: FeatureInput, otp: string) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v === null ? '' : String(v))
  for (const p of platform) fd.append('platforms[]', p) // PHP đọc thành mảng $_POST['platforms']
  appendContent(fd, content, files)
  fd.append('otp', otp)
  return fd
}

const data = async <T>(p: Promise<{ data: T }>) => (await p).data
const post = (c: string, m: string, query: Options['query'], body: unknown) =>
  request<{ data: Bug }>(c, m, { method: 'POST', query, body })

/** Bộ lọc/tìm kiếm/sắp xếp gửi lên Bug@index — server xử lý, FE không tự lọc */
export interface BugQuery {
  project?: string
  platform?: Platform
  core?: 'yes' | 'no'
  status?: Status
  severity?: Severity
  q?: string
  mine?: Mine
  sortBy?: 'code' | 'title' | 'severity' | 'status' | 'created_at'
  sortDir?: 'asc' | 'desc'
}

/** Bộ lọc/tìm kiếm gửi lên Feature@index — server xử lý, FE không tự lọc */
export interface FeatureQuery {
  project?: string
  platform?: Platform
  priority?: Priority
  status?: FeatureStatus
  q?: string
  mine?: Mine
  sortBy?: 'code' | 'title' | 'priority' | 'status' | 'created_at'
  sortDir?: 'asc' | 'desc'
}

/** Bảng gộp (Item@index): lọc + sắp xếp + phân trang + đếm tổng đều ở server */
export interface ItemQuery {
  project?: string
  type?: 'bug' | 'feature'
  q?: string
  mine?: Mine
  platform?: Platform
  core?: 'yes' | 'no'
  severity?: Severity
  status?: Status
  priority?: Priority
  fstatus?: FeatureStatus
  sortBy?: 'code' | 'level' | 'status' | 'created_at'
  sortDir?: 'asc' | 'desc'
  /** Bắt đầu từ 1 */
  page: number
  perPage: number
}

export interface ItemPage {
  items: ItemRow[]
  total: number
}

export interface ReleaseStatus {
  project: string | null
  ready: boolean
  blockingCount: number
  blocking: Pick<Bug, 'code' | 'title' | 'platform' | 'isCore' | 'severity' | 'status' | 'assignee'>[]
  /** Chỉ khi gộp mọi dự án (không truyền key) */
  projects?: { key: string; name: string; ready: boolean; blockingCount: number }[]
  totalProjects?: number
  blockedProjects?: number
}

export interface Me {
  id: string
  username: string
  employee_id: string
  name: string
  role: string | null
}

export interface Person {
  uuid: string
  username: string
  employeeId: string | null
  name: string
}

export const api = {
  me: () => data<Me>(request('Auth', 'me')),

  /** `q`: tìm theo username, họ tên, email, mã nhân viên (server) */
  listUsers: (q?: string) => data<Person[]>(request('User', 'index', { query: { limit: '200', q: q?.trim() } })),

  listProjects: () => data<Project[]>(request('Project', 'index')),

  createProject: (input: ProjectInput, otp: string) =>
    data<Project>(request('Project', 'store', { method: 'POST', body: { ...input, otp } })),

  listBugs: async (f: BugQuery = {}) =>
    (
      await data<Bug[]>(
        request('Bug', 'index', {
          query: {
            project: f.project,
            platform: f.platform,
            is_core: f.core && (f.core === 'yes' ? '1' : '0'),
            status: f.status,
            severity: f.severity,
            q: f.q?.trim(),
            mine: f.mine,
            sort_by: f.sortBy,
            sort_dir: f.sortDir,
          },
        }),
      )
    ).map(bugIn),

  releaseStatus: (key?: string) => data<ReleaseStatus>(request('Project', 'releaseStatus', { query: { key } })),

  getBug: async (code: string) => bugIn(await data(request<{ data: Bug }>('Bug', 'show', { query: { code } }))),

  createBug: async (input: BugInput, otp: string) =>
    bugIn((await post('Bug', 'store', undefined, bugForm(input, otp))).data),

  /** Sửa nội dung bug. Dự án, trạng thái và lịch sử không đổi qua đây. */
  updateBug: async (code: string, input: Omit<BugInput, 'projectId'>, otp: string) =>
    bugIn((await post('Bug', 'update', { code }, bugForm(input, otp))).data),

  changeStatus: async (code: string, status: Status) =>
    bugIn((await post('Bug', 'changeStatus', { code }, { status })).data),

  assign: async (code: string, assignee: string | null) =>
    bugIn((await post('Bug', 'assign', { code }, { assignee })).data),

  /** `confirm`: người dùng tự gõ lại mã dự án */
  deleteProject: async (key: string, confirm: string, otp: string) => {
    await request('Project', 'destroy', { method: 'POST', query: { key }, body: { confirm, otp } })
  },

  /** `confirm`: người dùng tự gõ lại mã bug */
  deleteBug: async (code: string, confirm: string, otp: string) => {
    await request('Bug', 'destroy', { method: 'POST', query: { code }, body: { confirm, otp } })
  },

  // ── Tính năng mong muốn: lọc/tìm ở server như bug (doc feature-request-api §2) ──
  listFeatures: async (f: FeatureQuery = {}) =>
    (
      await data<Feature[]>(
        request('Feature', 'index', {
          query: {
            project: f.project,
            platform: f.platform,
            priority: f.priority,
            status: f.status,
            q: f.q?.trim(),
            mine: f.mine,
            sort_by: f.sortBy,
            sort_dir: f.sortDir,
          },
        }),
      )
    ).map(featureIn),

  listItems: async (f: ItemQuery): Promise<ItemPage> => {
    const json = await request<{ data: ItemRow[]; meta: { total: number } }>('Item', 'index', {
      query: {
        project: f.project,
        type: f.type,
        q: f.q?.trim(),
        mine: f.mine,
        platform: f.platform,
        is_core: f.core && (f.core === 'yes' ? '1' : '0'),
        severity: f.severity,
        status: f.status,
        priority: f.priority,
        fstatus: f.fstatus,
        sort_by: f.sortBy,
        sort_dir: f.sortDir,
        page: String(f.page),
        per_page: String(f.perPage),
      },
    })
    return {
      items: json.data.map((r) =>
        r.kind === 'bug' ? { kind: 'bug', data: bugIn(r.data) } : { kind: 'feature', data: featureIn(r.data) },
      ),
      total: json.meta.total,
    }
  },

  getFeature: async (code: string) =>
    featureIn(await data(request<{ data: Feature }>('Feature', 'show', { query: { code } }))),

  createFeature: async (input: FeatureInput, otp: string) =>
    featureIn(
      await data(request<{ data: Feature }>('Feature', 'store', { method: 'POST', body: featureForm(input, otp) })),
    ),

  updateFeature: async (code: string, input: FeatureInput, otp: string) =>
    featureIn(
      await data(
        request<{ data: Feature }>('Feature', 'update', {
          method: 'POST',
          query: { code },
          body: featureForm(input, otp),
        }),
      ),
    ),

  changeFeatureStatus: async (code: string, status: FeatureStatus, rejectReason?: string) =>
    featureIn(
      await data(
        request<{ data: Feature }>('Feature', 'changeStatus', {
          method: 'POST',
          query: { code },
          body: { status, rejectReason },
        }),
      ),
    ),

  assignFeature: async (code: string, assignee: string | null) =>
    featureIn(
      await data(
        request<{ data: Feature }>('Feature', 'assign', { method: 'POST', query: { code }, body: { assignee } }),
      ),
    ),

  /** `confirm`: người dùng tự gõ lại mã đề xuất (backend kiểm, sai → confirm_mismatch) */
  deleteFeature: async (code: string, confirm: string, otp: string) => {
    await request('Feature', 'destroy', { method: 'POST', query: { code }, body: { confirm, otp } })
  },

  // ── Bình luận (bug + đề xuất): `id` có = sửa, không có = thêm ──
  saveComment: (kind: CommentKind, code: string, input: RichInput, id?: number) =>
    commentRequest(kind, id ? 'updateComment' : 'addComment', code, id, input),

  deleteComment: (kind: CommentKind, code: string, id: number) => commentRequest(kind, 'deleteComment', code, id),
}
