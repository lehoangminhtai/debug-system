import { Layers, Plus } from 'lucide-react'
import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useMatch, useSearchParams } from 'react-router-dom'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { isBlocking } from '@/lib/rules'
import { cn } from '@/lib/utils'
import { useBugs, useProjects } from '@/services/queries'

// Dialog (zod + react-hook-form) chỉ tải khi người dùng bấm "Dự án mới"
const NewProjectDialog = lazy(() => import('./new-project-dialog').then((m) => ({ default: m.NewProjectDialog })))

const itemClass = (isActive: boolean, collapsed: boolean) =>
  cn(
    'relative flex h-9 items-center gap-2 rounded-md text-sm font-medium whitespace-nowrap lg:h-8 text-muted-foreground transition-colors duration-150',
    'hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    collapsed ? 'justify-center px-0' : 'px-2',
    isActive && 'bg-primary-light text-primary-hover hover:bg-primary-light hover:text-primary-hover',
  )

/** Số bug bắt buộc sửa: mở rộng → số; thu gọn → chấm đỏ trên icon. Luôn có nhãn cho screen reader. */
function CountBadge({ n, label, collapsed }: { n: number; label: string; collapsed: boolean }) {
  if (!n) return null
  if (collapsed)
    return (
      <span className="bg-destructive ring-card absolute top-1 right-1 size-2 rounded-full ring-2">
        <span className="sr-only">{label}</span>
      </span>
    )
  return (
    <span className="bg-destructive-bg text-destructive-text ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
      <span aria-hidden>{n}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Chữ của mục: ẩn khi thu gọn nhưng vẫn là tên truy cập của link */
function Label({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return <span className={collapsed ? 'sr-only' : 'truncate'}>{children}</span>
}

export function ProjectNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { t } = useI18n()
  const projects = useProjects()
  const bugs = useBugs()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMounted, setDialogMounted] = useState(false)

  const blockingByProject = useMemo(() => {
    const counts = new Map<number, number>()
    for (const b of bugs.data ?? []) if (isBlocking(b)) counts.set(b.projectId, (counts.get(b.projectId) ?? 0) + 1)
    return counts
  }, [bugs.data])
  const totalBlocking = [...blockingByProject.values()].reduce((a, b) => a + b, 0)
  const countLabel = (n: number) => t('nav.mustFixCount', { n })
  const tip = (name: string, n: number) => (n ? `${name} · ${countLabel(n)}` : name)

  // Ở trang bug (/bugs/FF-001, /bugs/new?project=FF) vẫn đánh dấu dự án đang làm việc
  const bugMatch = useMatch('/bugs/:code/*')
  const [params] = useSearchParams()
  const code = bugMatch?.params.code
  const contextKey = code === 'new' ? params.get('project') : code?.split('-')[0]
  // className dạng chuỗi (không dùng hàm của NavLink): Slot của Tooltip nối className và làm hỏng dạng hàm
  const { pathname } = useLocation()
  const under = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  return (
    <nav aria-label={t('nav.main')} className="flex flex-col gap-0.5">
      <Hint label={tip(t('nav.allProjects'), totalBlocking)} side="right" disabled={!collapsed}>
        <NavLink to="/all" className={itemClass(under('/all'), collapsed)} onClick={onNavigate}>
          <Layers className="size-4 shrink-0" aria-hidden />
          <Label collapsed={collapsed}>{t('nav.allProjects')}</Label>
          <CountBadge n={totalBlocking} label={countLabel(totalBlocking)} collapsed={collapsed} />
        </NavLink>
      </Hint>

      {collapsed ? (
        <>
          <h2 className="sr-only">{t('nav.projects')}</h2>
          <div aria-hidden className="bg-border mx-auto my-3 h-px w-6" />
        </>
      ) : (
        <h2 className="text-muted-foreground mt-5 mb-1 px-2 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
          {t('nav.projects')}
        </h2>
      )}

      {projects.isPending ? (
        <div className={cn('flex flex-col gap-1.5', !collapsed && 'px-2')} aria-label={t('common.loading')}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      ) : projects.isError ? (
        <div role="alert" className={cn('text-destructive-text text-sm', collapsed ? 'sr-only' : 'px-2')}>
          {t('error.load')}{' '}
          <button className="underline underline-offset-2" onClick={() => projects.refetch()}>
            {t('action.retry')}
          </button>
        </div>
      ) : projects.data.length === 0 ? (
        <p className={cn('text-muted-foreground text-sm', collapsed ? 'sr-only' : 'px-2')}>
          {t('empty.noProjectsDesc')}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {projects.data.map((p) => {
            const n = blockingByProject.get(p.id) ?? 0
            return (
              <li key={p.id}>
                <Hint label={tip(p.name, n)} side="right" disabled={!collapsed}>
                  <NavLink
                    to={`/${p.key}`}
                    className={itemClass(under(`/${p.key}`) || contextKey === p.key, collapsed)}
                    onClick={onNavigate}
                    title={collapsed ? undefined : p.name}
                  >
                    <span className="bg-card text-foreground inline-flex h-5 w-8 shrink-0 items-center justify-center rounded-sm border font-mono text-xs">
                      {p.key}
                    </span>
                    <Label collapsed={collapsed}>{p.name}</Label>
                    <CountBadge n={n} label={countLabel(n)} collapsed={collapsed} />
                  </NavLink>
                </Hint>
              </li>
            )
          })}
        </ul>
      )}

      <Hint label={t('nav.newProject')} side="right" disabled={!collapsed}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={collapsed ? t('nav.newProject') : undefined}
          className={cn(
            'text-muted-foreground mt-1 whitespace-nowrap',
            collapsed ? 'justify-center px-0' : 'justify-start px-2',
          )}
          onClick={() => {
            setDialogMounted(true)
            setDialogOpen(true)
          }}
        >
          <Plus aria-hidden />
          {!collapsed && t('nav.newProject')}
        </Button>
      </Hint>
      {dialogMounted && (
        <Suspense>
          <NewProjectDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreated={onNavigate}
            existingKeys={projects.data?.map((p) => p.key) ?? []}
          />
        </Suspense>
      )}
    </nav>
  )
}
