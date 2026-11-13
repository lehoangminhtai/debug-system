// Quy tắc nghiệp vụ (bắt buộc sửa, chặn release, mã bug…) do backend tính và trả về (mustFix, blocksRelease,
// Project@releaseStatus) — FE không tự tính lại. Ở đây chỉ còn thứ tự hiển thị.
import type { Status } from '../types/index.ts'
import { STATUSES } from '../types/index.ts'

/** Vị trí trạng thái trên thanh tiến trình */
export const statusRank = (s: Status) => STATUSES.indexOf(s)
