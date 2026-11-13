import { Layers, Plus } from 'lucide-react'
import { Suspense, lazy, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useMatch, useSearchParams } from 'react-router-dom'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { useProjects, useReleaseStatus } from '@/services/queries'

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
function CountBadge({
  n,
  label,
  collapsed,
  tone = 'destructive',
}: {
  n: number
  label: string
  collapsed: boolean
  /** info: số đề xuất tính năng mới (không chặn release) */
  tone?: 'destructive' | 'info'
}) {
  if (!n) return null
  if (collapsed)
    return (
      <span
        className={cn(
          'ring-card absolute top-1 right-1 size-2 rounded-full ring-2',
          tone === 'info' ? 'bg-info' : 'bg-destructive',
        )}
      >
        <span className="sr-only">{label}</span>
      </span>
    )
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
        tone === 'info' ? 'bg-info-bg text-info-text' : 'bg-destructive-bg text-destructive-text',
      )}
    >
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMounted, setDialogMounted] = useState(false)

  // Tổng bug chặn release mọi dự án: server đếm (Project@releaseStatus, cùng cache với dòng release ở /all)
  const totalBlocking = useReleaseStatus().data?.blockingCount ?? 0
  const countLabel = (n: number) => t('nav.mustFixCount', { n })
  const tip = (name: string, n: number) => (n ? `${name} · ${countLabel(n)}` : name)

  // Ở trang bug / đề xuất (/bugs/FF-001, /features/FF-F001, /…/new?project=FF) vẫn đánh dấu dự án đang làm việc
  const itemMatch = useMatch('/:kind/:code/*')
  const [params] = useSearchParams()
  const kind = itemMatch?.params.kind
  const code = kind === 'bugs' || kind === 'features' ? itemMatch?.params.code : undefined

  // className dạng chuỗi (không dùng hàm của NavLink): Slot của Tooltip nối className và làm hỏng dạng hàm
  const { pathname } = useLocation()
  const under = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  // /new?project=FF, /bugs/FF-001, /features/FF-F001 vẫn đánh dấu dự án đang làm việc
  const contextKey = pathname === '/new' || code === 'new' ? params.get('project') : code?.split('-')[0]

  return (
    <nav aria-label={t('nav.main')} className="flex flex-col gap-0.5">
      <Hint label={t('nav.newProject')} side="right" disabled={!collapsed}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={collapsed ? t('nav.newProject') : undefined}
          className={cn(
            'border-primary/30 bg-primary-light text-primary-hover hover:bg-primary hover:text-primary-foreground mb-2 border font-semibold whitespace-nowrap',
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
            const n = p.mustFixOpen
            const active = under(`/${p.key}`) || contextKey === p.key
            return (
              <li key={p.id}>
                <Hint label={tip(p.name, n)} side="right" disabled={!collapsed}>
                  <NavLink
                    to={`/${p.key}`}
                    className={itemClass(active, collapsed)}
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

      {dialogMounted && (
        <Suspense>
          <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={onNavigate} />
        </Suspense>
      )}
    </nav>
  )
}
