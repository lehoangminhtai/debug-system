import { useOutletContext } from 'react-router-dom'
import type { Project } from '@/types'

/** Dữ liệu ScopeLayout truyền xuống trang Danh sách / Kanban */
export interface ScopeContext {
  /** null = "Tất cả dự án" */
  project: Project | null
  projects: Project[]
  isPending: boolean
  /** Mở modal "Tạo mới" (Bug | Tính năng mong muốn) */
  openCreate: () => void
}

export const useScope = () => useOutletContext<ScopeContext>()

/** Gắn vào link từ Danh sách/Kanban sang chi tiết → nút Back dùng lịch sử trình duyệt (giữ bộ lọc + vị trí cuộn) */
export const FROM_LIST = { fromList: true } as const
