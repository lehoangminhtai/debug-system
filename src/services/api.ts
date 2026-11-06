// Gọi backend thật (doc/debugging-system-api.md). Chữ ký hàm giữ nguyên như bản mock, chỉ bỏ tham số `who` (backend lấy từ token).
import type {
  Bug,
  BugInput,
  Feature,
  FeatureInput,
  FeatureStatus,
  Platform,
  Project,
  ProjectInput,
  Severity,
  Status,
} from '../types/index.ts'
import { createPersistedStore } from '../lib/persisted-store.ts'

// Máy chủ lấy từ .env (build) / .env.deploy (build:deploy) — xem README "Deploy"
// Ảnh luôn nằm trên máy chủ thật, kể cả khi dev chạy API ở localhost
const ORIGIN: string = import.meta.env.VITE_ORIGIN
// `npm run dev` → backend local; build → <VITE_ORIGIN><VITE_BASE>backend/ (vd. http://192.168.110.7/dts/backend/)
const API_BASE = import.meta.env.DEV ? 'http://localhost/dts/backend/' : `${ORIGIN}${import.meta.env.BASE_URL}backend/`

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

// Ảnh backend trả đường dẫn tương đối ('/web_develop/dts/upload/...'): thêm origin để <img> chạy được cả khi dev (trỏ về máy chủ thật).
// Khi gửi lại (sửa bug) phải trả về đúng nguyên văn nên cắt origin đi.
const imgIn = (url: string) => (url.startsWith('/') ? ORIGIN + url : url)
const imgOut = (url: string) => (url.startsWith(ORIGIN + '/') ? url.slice(ORIGIN.length) : url)

/** `platforms` (mảng) hoặc `platform` (chuỗi/mảng) của backend cũ → mảng; giá trị cũ 'window' → 'windows' */
const platformsIn = (v: Platform | Platform[]) =>
  [v].flat().map((p) => ((p as string) === 'window' ? 'windows' : p)) as Platform[]

// Backend dùng `platforms` (mảng); FE giữ tên `platform` nội bộ.
const bugIn = (b: Bug & { platforms?: Platform[] }): Bug => {
  const { platforms, ...rest } = b
  return {
    ...rest,
    platform: platformsIn(platforms ?? rest.platform),
    images: b.images.map((i) => ({ ...i, url: imgIn(i.url) })),
    history: b.history.map((h) => ({ ...h, target: h.target ?? undefined })),
  }
}

const bugOut = <T extends { platform: Platform[]; images: { url: string }[] }>({ platform, ...input }: T) => ({
  ...input,
  platforms: platform,
  images: input.images.map((i) => ({ ...i, url: imgOut(i.url) })),
})

// Giống bug: backend dùng `platforms` (mảng), FE giữ tên `platform`; nhận cả `platform` chuỗi từ backend cũ
const featureIn = ({ platforms, ...f }: Feature & { platforms?: Platform[] }): Feature => ({
  ...f,
  platform: platformsIn(platforms ?? f.platform),
  media: f.media.map((m) => ({ ...m, url: imgIn(m.url) })),
  history: f.history.map((h) => ({ ...h, target: h.target ?? undefined })),
})

/** multipart/form-data cho Feature@store/update (doc feature-request-api §12) */
function featureForm({ media, platform, ...fields }: FeatureInput, otp: string) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v === null ? '' : String(v))
  for (const p of platform) fd.append('platforms[]', p) // PHP đọc thành mảng $_POST['platforms']
  if (media.length === 0) fd.append('media', '') // rỗng = xoá hết
  media.forEach((m, i) => {
    if ('id' in m) fd.append(`media[${i}][id]`, String(m.id))
    else fd.append(`media[${i}][file]`, m.file, m.name)
    fd.append(`media[${i}][caption]`, m.caption)
  })
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
  sortBy?: 'code' | 'title' | 'severity' | 'status' | 'created_at'
  sortDir?: 'asc' | 'desc'
}

export interface ReleaseStatus {
  project: string | null
  ready: boolean
  blocking: Pick<Bug, 'code' | 'title' | 'platform' | 'isCore' | 'severity' | 'status' | 'assignee'>[]
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

  listUsers: () => data<Person[]>(request('User', 'index', { query: { limit: '200' } })),

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
            sort_by: f.sortBy,
            sort_dir: f.sortDir,
          },
        }),
      )
    ).map(bugIn),

  releaseStatus: (key?: string) => data<ReleaseStatus>(request('Project', 'releaseStatus', { query: { key } })),

  getBug: async (code: string) => bugIn(await data(request<{ data: Bug }>('Bug', 'show', { query: { code } }))),

  createBug: async (input: BugInput, otp: string) =>
    bugIn((await post('Bug', 'store', undefined, { ...bugOut(input), otp })).data),

  /** Sửa nội dung bug. Dự án, trạng thái và lịch sử không đổi qua đây. */
  updateBug: async (code: string, input: Omit<BugInput, 'projectId'>, otp: string) =>
    bugIn((await post('Bug', 'update', { code }, { ...bugOut(input), otp })).data),

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

  // ── Tính năng mong muốn: tải hết theo dự án, lọc ở client (doc feature-request-api §2) ──
  listFeatures: async (project?: string) =>
    (await data<Feature[]>(request('Feature', 'index', { query: { project } }))).map(featureIn),

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

  deleteFeature: async (code: string, otp: string) => {
    await request('Feature', 'destroy', { method: 'POST', query: { code }, body: { otp } })
  },
}
