import { createPersistedStore } from '@/lib/persisted-store'
import { MEMBERS, setCurrentUser, type Member } from './current-user'

// Đăng nhập GIẢ LẬP (chưa có backend): phiên lưu localStorage, mật khẩu cố định. Thay bằng API xác thực thật.
const DEMO_PASSWORD = '123456'
const store = createPersistedStore<Member | ''>(
  'debugs.session',
  '',
  (v): v is Member | '' => v === '' || (MEMBERS as readonly string[]).includes(v),
)

export const useSession = store.use

export function login(username: string, password: string): boolean {
  const member = MEMBERS.find((m) => m.toLowerCase() === username.trim().toLowerCase())
  if (!member || password !== DEMO_PASSWORD) return false
  setCurrentUser(member) // người thao tác ghi vào lịch sử = người đăng nhập
  store.set(member)
  return true
}

export const logout = () => store.set('')
