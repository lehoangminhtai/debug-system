import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bug, BugInput, Feature, FeatureInput, FeatureStatus, ProjectInput, Status } from '@/types'
import { LOCALES, getI18n, type TKey } from '@/i18n'
import { ApiError, api, type BugQuery, type Me, type Person } from './api'

const keys = {
  projects: ['projects'] as const,
  bugs: ['bugs'] as const,
  bugList: ['bugs', 'list'] as const,
  bug: (code: string) => ['bugs', code] as const,
  release: ['release'] as const,
  me: ['me'] as const,
  users: ['users'] as const,
  features: ['features'] as const,
  featureList: (project?: string) => ['features', 'list', project ?? ''] as const,
  feature: (code: string) => ['features', code] as const,
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

/** Danh sách bug: tìm kiếm, lọc, sắp xếp do server xử lý; giữ kết quả cũ trên màn hình trong lúc tải kết quả mới */
export const useBugs = (query: BugQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: [...keys.bugList, query],
    queryFn: () => api.listBugs(query),
    placeholderData: keepPreviousData,
  })

/** Trạng thái release do server tính, mỗi dự án một lời gọi (key rỗng = gộp mọi dự án) */
export const useReleaseStatuses = (projectKeys: string[]) =>
  useQueries({
    queries: projectKeys.map((key) => ({ queryKey: [...keys.release, key], queryFn: () => api.releaseStatus(key) })),
  })

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
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.bugs }),
      qc.invalidateQueries({ queryKey: keys.projects }),
      qc.invalidateQueries({ queryKey: keys.release }),
    ])
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, otp }: { input: ProjectInput; otp: string }) => api.createProject(input, otp),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }),
    meta: { silent: true }, // lỗi trùng mã hiển thị tại trường
  })
}

export function useCreateBug() {
  const invalidate = useInvalidateBugs()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, otp }: { input: BugInput; otp: string }) => api.createBug(input, otp),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }), // nextSeq đổi
    onSettled: invalidate,
  })
}

export function useUpdateBug(code: string) {
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ input, otp }: { input: Omit<BugInput, 'projectId'>; otp: string }) =>
      api.updateBug(code, input, otp),
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
    const prevLists = qc.getQueriesData<Bug[]>({ queryKey: keys.bugList })
    const prevBug = qc.getQueryData<Bug>(keys.bug(code))
    qc.setQueriesData<Bug[]>({ queryKey: keys.bugList }, (bugs) => bugs?.map((b) => (b.code === code ? patch(b) : b)))
    qc.setQueryData<Bug>(keys.bug(code), (b) => b && patch(b))
    return () => {
      prevLists.forEach(([key, data]) => qc.setQueryData(key, data))
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

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, confirm, otp }: { key: string; confirm: string; otp: string }) =>
      api.deleteProject(key, confirm, otp),
    // không await: để màn hình điều hướng về /all trước khi danh sách dự án tải lại (tránh nháy trang 404)
    onSuccess: () =>
      void Promise.all([
        qc.invalidateQueries({ queryKey: keys.projects }),
        qc.invalidateQueries({ queryKey: keys.bugs }),
        qc.invalidateQueries({ queryKey: keys.release }),
      ]),
  })
}

export function useDeleteBug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, confirm, otp }: { code: string; confirm: string; otp: string }) =>
      api.deleteBug(code, confirm, otp),
    onSuccess: (_d, { code }) => {
      qc.removeQueries({ queryKey: keys.bug(code) })
      return Promise.all([
        qc.invalidateQueries({ queryKey: keys.bugs }),
        qc.invalidateQueries({ queryKey: keys.projects }),
        qc.invalidateQueries({ queryKey: keys.release }),
      ])
    },
  })
}

// ── Tính năng mong muốn ──

/** Tải hết đề xuất của dự án một lần; lọc / sắp xếp ở client (doc API §2) */
export const useFeatures = (project?: string, enabled = true) =>
  useQuery({ queryKey: keys.featureList(project), queryFn: () => api.listFeatures(project), enabled })

export const useFeature = (code: string, enabled = true) =>
  useQuery({
    queryKey: keys.feature(code),
    queryFn: () => api.getFeature(code),
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
  })

/** Ghi xong: đặt ngay bản mới vào cache chi tiết, làm mới danh sách và sidebar (newFeatureCount, nextFeatureSeq) */
function useFeatureSaved() {
  const qc = useQueryClient()
  return (f: Feature) => {
    qc.setQueryData(keys.feature(f.code), f)
    return Promise.all([
      qc.invalidateQueries({ queryKey: keys.features, predicate: (q) => q.queryKey[1] === 'list' }),
      qc.invalidateQueries({ queryKey: keys.projects }),
    ])
  }
}

export function useCreateFeature() {
  const saved = useFeatureSaved()
  return useMutation({
    mutationFn: ({ input, otp }: { input: FeatureInput; otp: string }) => api.createFeature(input, otp),
    onSuccess: saved,
  })
}

export function useUpdateFeature(code: string) {
  const saved = useFeatureSaved()
  return useMutation({
    mutationFn: ({ input, otp }: { input: FeatureInput; otp: string }) => api.updateFeature(code, input, otp),
    onSuccess: saved,
  })
}

export function useChangeFeatureStatus() {
  const saved = useFeatureSaved()
  return useMutation({
    mutationFn: ({ code, status, rejectReason }: { code: string; status: FeatureStatus; rejectReason?: string }) =>
      api.changeFeatureStatus(code, status, rejectReason),
    onSuccess: saved,
  })
}

export function useAssignFeature() {
  const saved = useFeatureSaved()
  return useMutation({
    mutationFn: ({ code, assignee }: { code: string; assignee: string | null }) => api.assignFeature(code, assignee),
    onSuccess: saved,
  })
}

export function useDeleteFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, otp }: { code: string; otp: string }) => api.deleteFeature(code, otp),
    onSuccess: (_d, { code }) => {
      qc.removeQueries({ queryKey: keys.feature(code) })
      return Promise.all([
        qc.invalidateQueries({ queryKey: keys.features }),
        qc.invalidateQueries({ queryKey: keys.projects }),
      ])
    },
  })
}
