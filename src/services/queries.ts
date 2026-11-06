import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bug, BugInput, ProjectInput, Status } from '@/types'
import { LOCALES, getI18n, type TKey } from '@/i18n'
import { ApiError, api, type Me, type Person } from './api'

const keys = {
  projects: ['projects'] as const,
  bugs: ['bugs'] as const,
  bug: (code: string) => ['bugs', code] as const,
  me: ['me'] as const,
  users: ['users'] as const,
}

export function errorMessage(error: unknown) {
  const { t } = getI18n()
  const key = `error.${error instanceof ApiError ? error.code : ''}`
  return t(key in LOCALES.vi.dict ? (key as TKey) : 'error.generic')
}

/** Người đang đăng nhập (tên lấy từ token, backend ghi vào lịch sử) */
export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.me, staleTime: Infinity })

/** Danh bạ cho ô chọn người báo / người sửa; luôn gồm các tên `extra` (tên cũ có thể không còn trong danh bạ) */
export function usePeople(...extra: (string | null | undefined)[]): Pick<Person, 'name' | 'employeeId'>[] {
  const { data } = useQuery({ queryKey: keys.users, queryFn: api.listUsers, staleTime: 5 * 60_000 })
  const people = (data ?? []).map((u) => ({ name: u.name, employeeId: u.employeeId }))
  for (const name of extra) if (name && !people.some((p) => p.name === name)) people.push({ name, employeeId: null })
  return people
}

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: api.listProjects })

export const useBugs = () => useQuery({ queryKey: keys.bugs, queryFn: api.listBugs })

export const useBug = (code: string, enabled = true) =>
  useQuery({
    queryKey: keys.bug(code),
    queryFn: () => api.getBug(code),
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
  })

/** Mọi thay đổi bug đều làm mới cả danh sách lẫn chi tiết (cùng tiền tố ['bugs']) */
function useInvalidateBugs() {
  const qc = useQueryClient()
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: keys.bugs }), qc.invalidateQueries({ queryKey: keys.projects })])
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => api.createProject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }),
    meta: { silent: true }, // lỗi trùng mã hiển thị tại trường
  })
}

export function useCreateBug() {
  const invalidate = useInvalidateBugs()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BugInput) => api.createBug(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }), // nextSeq đổi
    onSettled: invalidate,
  })
}

export function useUpdateBug(code: string) {
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: (input: Omit<BugInput, 'projectId'>) => api.updateBug(code, input),
    onSettled: invalidate,
  })
}

/**
 * Cập nhật lạc quan một bug ở cả cache danh sách và cache chi tiết → giao diện đổi ngay (Kanban, Select ở chi tiết).
 * Trả về hàm hoàn tác dùng khi API lỗi.
 */
function useOptimisticBug() {
  const qc = useQueryClient()
  return async (code: string, patch: (b: Bug) => Bug) => {
    await qc.cancelQueries({ queryKey: keys.bugs })
    const prevList = qc.getQueryData<Bug[]>(keys.bugs)
    const prevBug = qc.getQueryData<Bug>(keys.bug(code))
    qc.setQueryData<Bug[]>(keys.bugs, (bugs) => bugs?.map((b) => (b.code === code ? patch(b) : b)))
    qc.setQueryData<Bug>(keys.bug(code), (b) => b && patch(b))
    return () => {
      qc.setQueryData(keys.bugs, prevList)
      qc.setQueryData(keys.bug(code), prevBug)
    }
  }
}

export function useChangeStatus() {
  const qc = useQueryClient()
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: Status }) => api.changeStatus(code, status),
    onMutate: ({ code, status }) =>
      optimistic(code, (b) => ({
        ...b,
        status,
        // giống quy tắc tự nhận bug ở api.changeStatus
        assignee: status === 'fixing' && !b.assignee ? (qc.getQueryData<Me>(keys.me)?.name ?? null) : b.assignee,
      })),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useAssign() {
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, assignee }: { code: string; assignee: string | null }) => api.assign(code, assignee),
    onMutate: ({ code, assignee }) => optimistic(code, (b) => ({ ...b, assignee })),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useDeleteBug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.deleteBug(code),
    onSuccess: (_d, code) => {
      qc.removeQueries({ queryKey: keys.bug(code) })
      return Promise.all([
        qc.invalidateQueries({ queryKey: keys.bugs }),
        qc.invalidateQueries({ queryKey: keys.projects }),
      ])
    },
  })
}
