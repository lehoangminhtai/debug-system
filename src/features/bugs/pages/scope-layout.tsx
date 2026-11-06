import { KanbanSquare, Lightbulb, List, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
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
 * kind="features": cùng khung cho Tính năng mong muốn (/FF/features, /FF/features/board) — không có trạng thái release.
 */
export function ScopeLayout({ kind = 'bugs' }: { kind?: 'bugs' | 'features' }) {
  const isFeature = kind === 'features'
  const { t } = useI18n()
  const { scope = 'all' } = useParams()
  const { pathname, search } = useLocation()
  const projects = useProjects()

  const project = scope === 'all' ? null : (projects.data?.find((p) => p.key === scope) ?? null)
  const title = project ? project.name : t('nav.allProjects')
  useDocumentTitle(projects.isPending ? undefined : isFeature ? `${t('nav.features')} · ${title}` : title)

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

  const ctx: ScopeContext = { project, projects: projects.data ?? [], isPending: projects.isPending }
  // giữ bộ lọc chung khi chuyển Danh sách ↔ Kanban (bỏ status vì Kanban đã chia cột theo trạng thái)
  const keep = new URLSearchParams(search)
  keep.delete('status')
  keep.delete('severity')
  const keepSearch = keep.size ? `?${keep}` : ''
  const base = isFeature ? `/${scope}/features` : `/${scope}`
  const newUrl = `/${isFeature ? 'features' : 'bugs'}/new${project ? `?project=${project.key}` : ''}`

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
          {isFeature ? (
            <p className="bg-primary-light text-primary-hover mt-2.5 inline-flex max-w-2xl gap-1.5 rounded-md px-2.5 py-1 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium whitespace-nowrap">{t('nav.features')}</span> · {t('feature.subtitle')}
              </span>
            </p>
          ) : (
            projects.isSuccess && (
              <div className="mt-2.5">
                <ReleaseStatus project={project} projects={ctx.projects} />
              </div>
            )
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
          <Button asChild>
            <Link to={newUrl}>
              <Plus aria-hidden />
              {t(isFeature ? 'feature.new' : 'action.reportBug')}
            </Link>
          </Button>
        </div>
      </div>

      <Outlet context={ctx} />
    </div>
  )
}
