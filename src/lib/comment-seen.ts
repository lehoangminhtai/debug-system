// "Đã xem bình luận tới đâu" (chấm mới ở danh sách/Kanban, nhãn MỚI ở chi tiết) + trạng thái thu gọn khối bình luận.
// ponytail: lưu ở localStorage của trình duyệt — đổi máy/trình duyệt thì mất. Cần đồng bộ nhiều máy → bảng
// comment_reads (user_id, item, seen_at) ở backend. Map không tự dọn: mỗi mục ~30 byte, vài nghìn mục vẫn nhỏ.
import { useSyncExternalStore } from 'react'
import { createPersistedStore } from '@/lib/persisted-store'
import type { CommentKind, LastComment } from '@/types'

const KEY = 'debugs.commentsSeen'
const listeners = new Set<() => void>()
let seen: Record<string, string> = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
})()

const key = (kind: CommentKind, code: string) => `${kind}:${code}`

/** Thời điểm bình luận mới nhất đã xem; undefined = chưa mở lần nào */
export const seenAt = (kind: CommentKind, code: string): string | undefined => seen[key(kind, code)]

/** Chưa xem lần nào → mọi bình luận đều là mới */
export const isNewer = (iso: string, since: string | undefined) => !since || Date.parse(iso) > Date.parse(since)

export function markSeen(kind: CommentKind, code: string, iso: string) {
  const prev = seenAt(kind, code)
  if (prev && Date.parse(prev) >= Date.parse(iso)) return
  seen = { ...seen, [key(kind, code)]: iso }
  try {
    localStorage.setItem(KEY, JSON.stringify(seen))
  } catch {
    // localStorage bị chặn → chỉ nhớ trong phiên này
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Có bình luận của người khác mới hơn lần xem cuối */
export function useHasUnread(kind: CommentKind, code: string, last: LastComment | null) {
  const since = useSyncExternalStore(subscribe, () => seenAt(kind, code))
  return !!last && !last.mine && isNewer(last.createdAt, since)
}

/** Thu gọn khối bình luận — nhớ chung cho mọi bug/đề xuất */
export const collapsedStore = createPersistedStore<'1' | '0'>(
  'debugs.commentsCollapsed',
  '0',
  (v): v is '1' | '0' => v === '1' || v === '0',
)
