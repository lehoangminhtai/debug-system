// Mock API — lưu trong localStorage của trình duyệt, KHÔNG lên server.
// Thay thân các hàm bằng fetch() tới backend thật; chữ ký hàm giữ nguyên để UI không phải sửa.
import type { Bug, BugHistory, BugInput, HistoryAction, Project, ProjectInput, Status } from '../types/index.ts'
import { PROJECT_KEY_PATTERN, formatBugCode } from '../lib/rules.ts'
import { createSeed } from './seed.ts'

export type ApiErrorCode = 'not_found' | 'duplicate_key' | 'invalid_key' | 'storage_full'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode) {
    super(code)
    this.code = code
  }
}

const STORAGE_KEY = 'debugs.db.v1'
const LATENCY_MS = 250

type Db = ReturnType<typeof createSeed>

function load(): Db {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) return JSON.parse(raw) as Db
  const seed = createSeed()
  save(seed)
  return seed
}

function save(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    throw new ApiError('storage_full')
  }
}

/** Mô phỏng độ trễ mạng; mỗi lệnh đọc/ghi trọn vẹn trên một bản db để không lưu nửa chừng */
async function run<T>(fn: (db: Db) => T, write = false): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const db = load()
  const result = fn(db)
  if (write) save(db)
  return structuredClone(result)
}

const now = () => new Date().toISOString()

function findBug(db: Db, code: string) {
  const bug = db.bugs.find((b) => b.code === code)
  if (!bug) throw new ApiError('not_found')
  return bug
}

function log(db: Db, bug: Bug, who: string, action: HistoryAction, target?: string) {
  const entry: BugHistory = { id: ++db.ids.history, status: bug.status, who, action, target, createdAt: now() }
  bug.history.push(entry)
}

export const api = {
  listProjects: () => run((db) => db.projects),

  createProject: (input: ProjectInput) =>
    run((db): Project => {
      const key = input.key.trim().toUpperCase()
      if (!PROJECT_KEY_PATTERN.test(key)) throw new ApiError('invalid_key')
      if (db.projects.some((p) => p.key === key)) throw new ApiError('duplicate_key')
      const project = {
        id: ++db.ids.project,
        key,
        name: input.name.trim(),
        description: input.description.trim(),
        nextSeq: 1,
      }
      db.projects.push(project)
      return project
    }, true),

  listBugs: () => run((db) => db.bugs),

  getBug: (code: string) => run((db) => findBug(db, code)),

  createBug: (input: BugInput, who: string) =>
    run((db): Bug => {
      const project = db.projects.find((p) => p.id === input.projectId)
      if (!project) throw new ApiError('not_found')
      const seq = project.nextSeq++
      const { images, ...fields } = input
      const bug: Bug = {
        ...fields,
        id: ++db.ids.bug,
        seq,
        code: formatBugCode(project.key, seq),
        status: 'new',
        createdAt: now(),
        images: images.map((img) => ({ ...img, id: ++db.ids.image })),
        history: [],
      }
      log(db, bug, who, 'create')
      if (bug.assignee) log(db, bug, who, 'assign', bug.assignee)
      db.bugs.push(bug)
      return bug
    }, true),

  /** Sửa nội dung bug. Dự án, trạng thái và lịch sử không đổi qua đây. */
  updateBug: (code: string, input: Omit<BugInput, 'projectId'>, who: string) =>
    run((db): Bug => {
      const bug = findBug(db, code)
      const { images, assignee, ...fields } = input
      Object.assign(bug, fields)
      // giữ id ảnh cũ, cấp id cho ảnh mới
      bug.images = images.map((img) => {
        const existing = bug.images.find((i) => i.url === img.url)
        return { ...img, id: existing?.id ?? ++db.ids.image }
      })
      log(db, bug, who, 'edit')
      if (assignee !== bug.assignee) {
        bug.assignee = assignee
        log(db, bug, who, assignee ? 'assign' : 'unassign', assignee ?? undefined)
      }
      return bug
    }, true),

  /** Đổi trạng thái. Chuyển sang "Đang sửa" khi chưa có người sửa → người thao tác tự nhận bug (BR-6). */
  changeStatus: (code: string, status: Status, who: string) =>
    run((db): Bug => {
      const bug = findBug(db, code)
      if (bug.status === status) return bug
      const from = bug.status
      bug.status = status
      if (status === 'fixing' && !bug.assignee) {
        bug.assignee = who
        log(db, bug, who, 'claim')
      } else {
        log(db, bug, who, 'status', from)
      }
      return bug
    }, true),

  assign: (code: string, assignee: string | null, who: string) =>
    run((db): Bug => {
      const bug = findBug(db, code)
      if (bug.assignee === assignee) return bug
      bug.assignee = assignee
      log(db, bug, who, assignee ? 'assign' : 'unassign', assignee ?? undefined)
      return bug
    }, true),

  /** Xóa bug. project.nextSeq không giảm → mã đã xóa không bao giờ được cấp lại. */
  deleteBug: (code: string) =>
    run((db) => {
      findBug(db, code)
      db.bugs = db.bugs.filter((b) => b.code !== code)
    }, true),
}
