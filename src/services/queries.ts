import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Bug,
  BugInput,
  CommentKind,
  Feature,
  FeatureInput,
  FeatureStatus,
  ItemRow,
  ProjectInput,
  RichInput,
  Status,
} from '@/types'
import { LOCALES, getI18n, type TKey } from '@/i18n'
import { ApiError, api, type BugQuery, type FeatureQuery, type ItemPage, type ItemQuery, type Person } from './api'

const keys = {
  projects: ['projects'] as const,
  bugs: ['bugs'] as const,
  bugList: ['bugs', 'list'] as const,
  bug: (code: string) => ['bugs', code] as const,
  release: ['release'] as const,
  me: ['me'] as const,
  users: ['users'] as const,
  features: ['features'] as const,
  featureList: (query: FeatureQuery) => ['features', 'list', query] as const,
  feature: (code: string) => ['features', code] as const,
  /** Bảng gộp bug + đề xuất — đổi bug hay đề xuất đều phải làm mới */
  items: ['items'] as const,
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
  const { data } = useQuery({ queryKey: keys.users, queryFn: () => api.listUsers(), staleTime: 5 * 60_000 })
  const people = (data ?? []).map((u) => ({ name: u.name, employeeId: u.employeeId }))
  for (const name of extra) if (name && !people.some((p) => p.name === name)) people.push({ name, employeeId: null })
  return people
}

/** Ô chọn người đang gõ tìm → server tìm (User@index?q=); `q` rỗng thì không gọi */
export const useUserSearch = (q: string) =>
  useQuery({
    queryKey: [...keys.users, q],
    queryFn: () => api.listUsers(q),
    enabled: !!q,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: api.listProjects })

/** Danh sách bug: tìm kiếm, lọc, sắp xếp do server xử lý; giữ kết quả cũ trên màn hình trong lúc tải kết quả mới */
// Tải định kỳ để thấy bình luận / thay đổi của người khác mà không cần F5. React Query tự dừng khi tab bị ẩn
// (refetchIntervalInBackground mặc định false) và tải ngay khi quay lại tab.
// ponytail: polling đơn giản; nhiều người dùng hơn → endpoint nhẹ chỉ trả commentCount/lastComment, hoặc SSE.
/** Trang chi tiết: bình luận mới gần như tức thì */
const DETAIL_POLL_MS = 5_000
/** Danh sách / Kanban: số 💬 và chấm mới */
const LIST_POLL_MS = 30_000

export const useBugs = (query: BugQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: [...keys.bugList, query],
    queryFn: () => api.listBugs(query),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_POLL_MS,
  })

/** Bảng gộp: server lọc, sắp xếp, phân trang, đếm tổng (Item@index) */
export const useItems = (query: ItemQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: [...keys.items, query],
    queryFn: () => api.listItems(query),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_POLL_MS,
  })

/** Trạng thái release do server tính. Không có key = gộp mọi dự án, kèm tóm tắt từng dự án */
export const useReleaseStatus = (key?: string) =>
  useQuery({ queryKey: [...keys.release, key ?? ''], queryFn: () => api.releaseStatus(key) })

/** `poll`: chỉ trang chi tiết (trang sửa không cần tải lại) */
export const useBug = (code: string, enabled = true, poll = false) =>
  useQuery({
    queryKey: keys.bug(code),
    queryFn: () => api.getBug(code),
    enabled,
    refetchInterval: poll ? DETAIL_POLL_MS : false,
    refetchOnWindowFocus: poll, // quay lại tab → tải ngay (mặc định app tắt)
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
  })

/** Mọi thay đổi bug đều làm mới cả danh sách lẫn chi tiết (cùng tiền tố ['bugs']) */
function useInvalidateBugs() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.bugs }),
      qc.invalidateQueries({ queryKey: keys.items }),
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

/**
 * Lạc quan chỉ phần người dùng vừa chọn (trạng thái / người sửa) để Kanban, Select đổi ngay. Hệ quả do server quyết
 * (tự nhận bug, mustFix, lịch sử…) không đoán ở FE: lấy bản server trả về ghi vào cache chi tiết, rồi làm mới danh sách.
 */
export function useChangeStatus() {
  const qc = useQueryClient()
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: Status }) => api.changeStatus(code, status),
    onMutate: ({ code, status }) => optimistic(code, (b) => ({ ...b, status })),
    onSuccess: (bug) => qc.setQueryData(keys.bug(bug.code), bug),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useAssign() {
  const qc = useQueryClient()
  const optimistic = useOptimisticBug()
  const invalidate = useInvalidateBugs()
  return useMutation({
    mutationFn: ({ code, assignee }: { code: string; assignee: string | null }) => api.assign(code, assignee),
    onMutate: ({ code, assignee }) => optimistic(code, (b) => ({ ...b, assignee })),
    onSuccess: (bug) => qc.setQueryData(keys.bug(bug.code), bug),
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
        qc.invalidateQueries({ queryKey: keys.features }),
        qc.invalidateQueries({ queryKey: keys.items }),
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
        qc.invalidateQueries({ queryKey: keys.items }),
        qc.invalidateQueries({ queryKey: keys.projects }),
        qc.invalidateQueries({ queryKey: keys.release }),
      ])
    },
  })
}

// ── Bình luận (bug + đề xuất) ──

/** Backend trả lại cả bug/đề xuất kèm `comments` → ghi thẳng vào cache chi tiết, không cần tải lại */
function useCommentMutation<V>(kind: CommentKind, code: string, fn: (v: V) => Promise<Bug | Feature>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (item) => {
      qc.setQueryData(kind === 'bug' ? keys.bug(code) : keys.feature(code), item)
      // Danh sách / Kanban: cập nhật 💬 N ngay, không tải lại cả danh sách
      const { commentCount, lastComment } = item
      qc.setQueriesData<(Bug | Feature)[]>({ queryKey: kind === 'bug' ? keys.bugList : ['features', 'list'] }, (list) =>
        list?.map((x) => (x.code === code ? { ...x, commentCount, lastComment } : x)),
      )
      qc.setQueriesData<ItemPage>(
        { queryKey: keys.items },
        (page) =>
          page && {
            ...page,
            items: page.items.map((r) =>
              r.kind === kind && r.data.code === code
                ? ({ ...r, data: { ...r.data, commentCount, lastComment } } as ItemRow)
                : r,
            ),
          },
      )
    },
  })
}

/** `id` có = sửa bình luận, không có = thêm mới */
export const useSaveComment = (kind: CommentKind, code: string) =>
  useCommentMutation(kind, code, ({ input, id }: { input: RichInput; id?: number }) =>
    api.saveComment(kind, code, input, id),
  )

export const useDeleteComment = (kind: CommentKind, code: string) =>
  useCommentMutation(kind, code, (id: number) => api.deleteComment(kind, code, id))

// ── Tính năng mong muốn ──

/** Đề xuất theo bộ lọc — server lọc/tìm như useBugs */
export const useFeatures = (query: FeatureQuery, enabled = true) =>
  useQuery({
    queryKey: keys.featureList(query),
    queryFn: () => api.listFeatures(query),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: LIST_POLL_MS,
  })

/** `poll`: chỉ trang chi tiết (trang sửa không cần tải lại) */
export const useFeature = (code: string, enabled = true, poll = false) =>
  useQuery({
    queryKey: keys.feature(code),
    queryFn: () => api.getFeature(code),
    enabled,
    refetchInterval: poll ? DETAIL_POLL_MS : false,
    refetchOnWindowFocus: poll, // quay lại tab → tải ngay (mặc định app tắt)
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
  })

/** Ghi xong: đặt ngay bản mới vào cache chi tiết, làm mới danh sách và sidebar (newFeatureCount, nextFeatureSeq) */
function useFeatureSaved() {
  const qc = useQueryClient()
  return (f: Feature) => {
    qc.setQueryData(keys.feature(f.code), f)
    return Promise.all([
      qc.invalidateQueries({ queryKey: keys.features, predicate: (q) => q.queryKey[1] === 'list' }),
      qc.invalidateQueries({ queryKey: keys.items }),
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
    mutationFn: ({ code, confirm, otp }: { code: string; confirm: string; otp: string }) =>
      api.deleteFeature(code, confirm, otp),
    onSuccess: (_d, { code }) => {
      qc.removeQueries({ queryKey: keys.feature(code) })
      return Promise.all([
        qc.invalidateQueries({ queryKey: keys.features }),
        qc.invalidateQueries({ queryKey: keys.items }),
        qc.invalidateQueries({ queryKey: keys.projects }),
      ])
    },
  })
}
