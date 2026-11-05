import { createPersistedStore } from '@/lib/persisted-store'
import { MEMBERS } from './seed'

export { MEMBERS }
export type Member = (typeof MEMBERS)[number]

/** Người đang thao tác — ghi vào cột "ai" của lịch sử. Thay bằng user đăng nhập khi có auth. */
const store = createPersistedStore<Member>('debugs.currentUser', 'Lan', (v): v is Member =>
  (MEMBERS as readonly string[]).includes(v),
)

export const useCurrentUser = store.use
export const setCurrentUser = store.set
export const getCurrentUser = store.get
