// Gọi backend thật (doc/debugging-system-api.md). Chữ ký hàm giữ nguyên như bản mock, chỉ bỏ tham số `who` (backend lấy từ token).
import type { Bug, BugInput, Project, ProjectInput, Status } from '../types/index.ts'
import { createPersistedStore } from '../lib/persisted-store.ts'

// `npm run dev` → backend local; `npm run build` → máy chủ thật
const API_BASE = import.meta.env.DEV ? 'http://localhost/dts/backend/' : 'http://192.168.110.2/web_develop/dts/backend/'
// Ảnh luôn nằm trên máy chủ thật, kể cả khi dev chạy API ở localhost
const ORIGIN = 'http://192.168.110.2'

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
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}?${params}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network')
  }
  const json = await res.json().catch(() => null)

  // Đăng nhập đi qua login() riêng nên mọi 401 ở đây đều là mất phiên
  if (res.status === 401 && c !== 'Auth') {
    tokenStore.set('')
    throw new ApiError('session_expired')
  }
  if (!res.ok || json?.success === false) throw new ApiError(json?.code ?? 'generic')
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

const bugIn = (b: Bug): Bug => ({
  ...b,
  images: b.images.map((i) => ({ ...i, url: imgIn(i.url) })),
  history: b.history.map((h) => ({ ...h, target: h.target ?? undefined })),
})

const bugOut = <T extends { images: { url: string }[] }>(input: T): T => ({
  ...input,
  images: input.images.map((i) => ({ ...i, url: imgOut(i.url) })),
})

const data = async <T>(p: Promise<{ data: T }>) => (await p).data
const post = (c: string, m: string, query: Options['query'], body: unknown) =>
  request<{ data: Bug }>(c, m, { method: 'POST', query, body })

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

  createProject: (input: ProjectInput) => data<Project>(request('Project', 'store', { method: 'POST', body: input })),

  listBugs: async () => (await data<Bug[]>(request('Bug', 'index'))).map(bugIn),

  getBug: async (code: string) => bugIn(await data(request<{ data: Bug }>('Bug', 'show', { query: { code } }))),

  createBug: async (input: BugInput) => bugIn((await post('Bug', 'store', undefined, bugOut(input))).data),

  /** Sửa nội dung bug. Dự án, trạng thái và lịch sử không đổi qua đây. */
  updateBug: async (code: string, input: Omit<BugInput, 'projectId'>) =>
    bugIn((await post('Bug', 'update', { code }, bugOut(input))).data),

  changeStatus: async (code: string, status: Status) =>
    bugIn((await post('Bug', 'changeStatus', { code }, { status })).data),

  assign: async (code: string, assignee: string | null) =>
    bugIn((await post('Bug', 'assign', { code }, { assignee })).data),

  deleteBug: async (code: string) => {
    await request('Bug', 'destroy', { method: 'POST', query: { code }, body: {} })
  },
}
