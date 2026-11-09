import { KanbanSquare, List, Plus } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { toast } from 'sonner'
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { OtpDeleteButton } from '@/components/common/otp-dialog'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NotFoundPage } from '@/app/not-found-page'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import { useDeleteProject, useProjects } from '@/services/queries'
import { ReleaseStatus } from '../components/release-status'
import type { ScopeContext } from '../hooks/use-scope'

// Modal tạo mới (2 form + zod + xử lý ảnh/video) chỉ tải khi mở lần đầu
const CreateItemDialog = lazy(() =>
  import('@/features/items/components/create-item-dialog').then((m) => ({ default: m.CreateItemDialog })),
)

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    isActive ? 'bg-primary-light text-primary-hover' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  )

function DeleteProjectButton({ project }: { project: Project }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const del = useDeleteProject()
  return (
    <OtpDeleteButton
      title={t('project.deleteTitle', { name: project.name })}
      description={t('project.deleteDesc', { name: project.name })}
      confirmLabel={t('action.deleteProject')}
      confirmCode={project.key}
      onConfirm={(otp, confirm) =>
        del.mutateAsync({ key: project.key, confirm, otp }).then(() => {
          toast.success(t('toast.projectDeleted', { name: project.name }))
          navigate('/all', { replace: true })
        })
      }
    />
  )
}

/**
 * Khung chung cho Danh sách và Kanban: tiêu đề phạm vi, trạng thái release, tab.
 * Bug và Tính năng mong muốn chung một bảng (lọc theo cột "Loại"), một nút "Tạo mới" (chọn loại trên form).
 */
export function ScopeLayout() {
  const { t } = useI18n()
  const { scope = 'all' } = useParams()
  const { pathname, search } = useLocation()
  const [params, setParams] = useSearchParams()
  const projects = useProjects()

  // Modal "Tạo mới" mở theo ?create=bug|feature → link cũ /new, /bugs/new, /features/new cũng mở được modal
  const createParam = params.get('create')
  const createType = createParam === 'feature' ? 'feature' : createParam ? 'bug' : null
  const setCreate = (v: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set('create', v)
        else next.delete('create')
        return next
      },
      { replace: true },
    )
  // đang lọc "Loại" → chọn sẵn loại đó trong modal
  const openCreate = () => setCreate(params.get('type') === 'feature' ? 'feature' : 'bug')

  const project = scope === 'all' ? null : (projects.data?.find((p) => p.key === scope) ?? null)
  const title = project ? project.name : t('nav.allProjects')
  useDocumentTitle(projects.isPending ? undefined : title)

  if (projects.isError) return <ErrorState onRetry={() => projects.refetch()} className="py-24" titleAs="h1" />
  // /ff → /FF: mã dự án luôn in hoa, gõ thường vẫn tới đúng trang
  const upper = scope.toUpperCase()
  if (
    projects.isSuccess &&
    scope !== 'all' &&
    !project &&
    scope !== upper &&
    projects.data.some((p) => p.key === upper)
  )
    return <Navigate replace to={pathname.replace(`/${scope}`, `/${upper}`) + search} />
  if (projects.isSuccess && scope !== 'all' && !project)
    return <NotFoundPage title={t('error.projectNotFound', { key: scope })} />

  const ctx: ScopeContext = { project, projects: projects.data ?? [], isPending: projects.isPending, openCreate }
  // giữ bộ lọc chung khi chuyển Danh sách ↔ Kanban (bỏ status vì Kanban đã chia cột theo trạng thái)
  const keep = new URLSearchParams(search)
  keep.delete('status')
  keep.delete('fstatus')
  keep.delete('severity')
  keep.delete('create')
  const keepSearch = keep.size ? `?${keep}` : ''
  const base = `/${scope}`

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {projects.isPending ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              {title}
              {project && (
                <span className="text-muted-foreground rounded-sm border px-1.5 font-mono text-xs font-medium">
                  {project.key}
                </span>
              )}
            </h1>
          )}
          {project && <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{project.description}</p>}
          {projects.isSuccess && (
            <div className="mt-2.5">
              <ReleaseStatus project={project} projects={ctx.projects} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <nav
            aria-label={t('view.label')}
            className="bg-card flex items-center gap-0.5 rounded-lg border p-0.5 shadow-xs"
          >
            <NavLink to={`${base}${keepSearch}`} end className={tabClass}>
              <List className="size-4" aria-hidden />
              {t('view.list')}
            </NavLink>
            <NavLink to={`${base}/board${keepSearch}`} className={tabClass}>
              <KanbanSquare className="size-4" aria-hidden />
              {t('view.board')}
            </NavLink>
          </nav>
          {project && <DeleteProjectButton project={project} />}
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            {t('action.createItem')}
          </Button>
        </div>
      </div>

      <Outlet context={ctx} />

      {createType && projects.isSuccess && (
        <Suspense>
          <CreateItemDialog
            openType={createType}
            onClose={() => setCreate(null)}
            projects={projects.data}
            projectKey={project?.key}
          />
        </Suspense>
      )}
    </div>
  )
}
