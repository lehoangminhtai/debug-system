// Chạy: npm test  (node --experimental-strip-types)
import assert from 'node:assert/strict'

const store = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
})

const { isMustFix, releaseStatus, formatBugCode } = await import('../src/lib/rules.ts')
const { api } = await import('../src/services/api.ts')

// §3.3 — bảng quy tắc xử lý
assert.equal(isMustFix({ isCore: true, severity: 'low' }), true)
assert.equal(isMustFix({ isCore: false, severity: 'critical' }), true)
assert.equal(isMustFix({ isCore: false, severity: 'high' }), false)
assert.equal(isMustFix({ isCore: false, severity: 'low' }), false)

// §2.1 — định dạng mã
assert.equal(formatBugCode('FF', 7), 'FF-007')
assert.equal(formatBugCode('SM', 1234), 'SM-1234')

// §8 — dữ liệu mẫu: FoodFast còn 3 bug chặn → chưa được release
const bugs = await api.listBugs()
const ff = releaseStatus(bugs.filter((b) => b.code.startsWith('FF-')))
assert.equal(ff.ready, false)
assert.deepEqual(ff.blocking.map((b) => b.code).sort(), ['FF-001', 'FF-002', 'FF-003'])
assert.equal(releaseStatus(bugs.filter((b) => b.code.startsWith('HR-'))).ready, true)

// §2.1 — xóa FF-003 thì bug mới vẫn là FF-008
await api.deleteBug('FF-003')
const input = {
  projectId: 1,
  title: 't',
  platform: 'web' as never,
  isCore: false,
  severity: 'low' as const,
  steps: 's',
  expected: 'e',
  actual: 'a',
  note: '',
  reporter: 'Lan',
  assignee: null,
  images: [],
}
assert.equal((await api.createBug(input, 'Lan')).code, 'FF-008')
assert.equal((await api.createBug(input, 'Lan')).code, 'FF-009')

// BR-6 — chuyển sang Đang sửa khi chưa có người sửa → tự nhận
const claimed = await api.changeStatus('FF-009', 'fixing', 'Minh')
assert.equal(claimed.assignee, 'Minh')
assert.equal(claimed.history.at(-1)?.action, 'claim')

// Đóng bug chặn → đổi trạng thái release
for (const code of ['FF-001', 'FF-002']) await api.changeStatus(code, 'closed', 'Lan')
const after = releaseStatus((await api.listBugs()).filter((b) => b.code.startsWith('FF-')))
assert.equal(after.ready, true)

// Trùng mã dự án bị từ chối
await assert.rejects(api.createProject({ key: 'ff', name: 'x', description: 'x' }), { message: 'duplicate_key' })

console.log('rules.test: all assertions passed')
