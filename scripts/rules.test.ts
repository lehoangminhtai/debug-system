// Chạy: npm test  (node --experimental-strip-types)
import assert from 'node:assert/strict'

const { isMustFix, releaseStatus, formatBugCode } = await import('../src/lib/rules.ts')

// §3.3 — bảng quy tắc xử lý
assert.equal(isMustFix({ isCore: true, severity: 'low' }), true)
assert.equal(isMustFix({ isCore: false, severity: 'critical' }), true)
assert.equal(isMustFix({ isCore: false, severity: 'high' }), false)
assert.equal(isMustFix({ isCore: false, severity: 'low' }), false)

// §2.1 — định dạng mã
assert.equal(formatBugCode('FF', 7), 'FF-007')
assert.equal(formatBugCode('SM', 1234), 'SM-1234')

// Chặn release khi còn bug bắt buộc sửa chưa đóng
const bug = (code: string, isCore: boolean, status: 'new' | 'closed') =>
  ({ code, isCore, severity: 'low', status }) as never
assert.equal(releaseStatus([bug('A-1', true, 'new')]).ready, false)
assert.equal(releaseStatus([bug('A-1', true, 'closed'), bug('A-2', false, 'new')]).ready, true)

console.log('rules.test: all assertions passed')
