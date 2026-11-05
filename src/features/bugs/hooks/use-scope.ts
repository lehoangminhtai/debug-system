import { useOutletContext } from 'react-router-dom'
import type { Bug, Project } from '@/types'

/** Dữ liệu ScopeLayout truyền xuống trang Danh sách / Kanban */
export interface ScopeContext {
  /** null = "Tất cả dự án" */
  project: Project | null
  projects: Project[]
  bugs: Bug[]
  isPending: boolean
  isError: boolean
  refetch: () => void
}

export const useScope = () => useOutletContext<ScopeContext>()

/** Gắn vào link từ Danh sách/Kanban sang chi tiết → nút Back dùng lịch sử trình duyệt (giữ bộ lọc + vị trí cuộn) */
export const FROM_LIST = { fromList: true } as const
