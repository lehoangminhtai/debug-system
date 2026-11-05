import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bug, BugInput, ProjectInput, Status } from '@/types'
import { getI18n } from '@/i18n'
import { ApiError, api } from './api'
import { getCurrentUser } from './current-user'

const keys = {
  projects: ['projects'] as const,
  bugs: ['bugs'] as const,
  bug: (code: string) => ['bugs', code] as const,
}

export function errorMessage(error: unknown) {
  const { t } = getI18n()
  return error instanceof ApiError ? t(`error.${error.code}`) : t('error.generic')
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
  return () => qc.invalidateQueries({ queryKey: keys.bugs })
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
    mutationFn: (input: BugInput) => api.createBug(input, getCurrentUser()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }), // nextSeq đổi
    onSettled: invalidate,
  })
}

export function useUpdateBug(code: string) {
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: (input: Omit<BugInput, 'projectId'>) => api.updateBug(code, input, getCurrentUser()),
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
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: Status }) =>
      api.changeStatus(code, status, getCurrentUser()),
    onMutate: ({ code, status }) =>
      optimistic(code, (b) => ({
        ...b,
        status,
        // giống quy tắc tự nhận bug ở api.changeStatus
        assignee: status === 'fixing' && !b.assignee ? getCurrentUser() : b.assignee,
      })),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useAssign() {
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, assignee }: { code: string; assignee: string | null }) =>
      api.assign(code, assignee, getCurrentUser()),
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
      return qc.invalidateQueries({ queryKey: keys.bugs })
    },
  })
}
