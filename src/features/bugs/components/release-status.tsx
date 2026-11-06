import { Info, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Hint } from '@/components/common/hint'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { useReleaseStatuses } from '@/services/queries'
import type { ReleaseStatus as Release } from '@/services/api'
import type { Project } from '@/types'
import { FROM_LIST } from '../hooks/use-scope'

const chipClass =
  'focus-visible:ring-ring inline-flex h-6 items-center gap-1.5 rounded-sm border bg-card px-2 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none'

/** Trạng thái release (spec §5) dạng một dòng trong tiêu đề trang — không dùng card/banner */
function Line({ ready, title, children }: { ready: boolean; title: string; children: React.ReactNode }) {
  const { t } = useI18n()
  const Icon = ready ? ShieldCheck : ShieldAlert
  return (
    <section aria-label={title} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold',
          ready ? 'text-success-text' : 'text-destructive-text',
        )}
      >
        <Icon className="size-4" aria-hidden />
        {title}
      </span>
      {children}
      <Hint label={t('release.rule')}>
        <button
          type="button"
          aria-label={t('release.rule')}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-6 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Hint>
    </section>
  )
}

function ProjectRelease({ ready, blocking }: Pick<Release, 'ready' | 'blocking'>) {
  const { t } = useI18n()
  return (
    <Line ready={ready} title={t(ready ? 'release.ready' : 'release.blocked')}>
      <span className="text-muted-foreground">
        · {ready ? t('release.readyDesc') : t('release.blockedDesc', { n: blocking.length })}
      </span>
      {!ready && (
        <ul className="flex flex-wrap gap-1.5">
          {blocking.map((b) => (
            <li key={b.code}>
              <Link
                to={`/bugs/${b.code}`}
                state={FROM_LIST}
                title={b.title}
                className={cn(chipClass, 'text-destructive-text hover:border-destructive/50 font-mono')}
              >
                {b.code}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Line>
  )
}

function AllRelease({ projects, statuses }: { projects: Project[]; statuses: Release[] }) {
  const { t } = useI18n()
  const rows = projects.map((p, i) => ({ project: p, ready: statuses[i].ready, blocking: statuses[i].blocking }))
  const blockedCount = rows.filter((r) => !r.ready).length
  const ready = blockedCount === 0
  const title = ready
    ? t('release.allReady', { total: projects.length })
    : t('release.allBlocked', { n: blockedCount, total: projects.length })
  return (
    <Line ready={ready} title={title}>
      <ul className="flex flex-wrap gap-1.5">
        {rows.map(({ project, ready: ok, blocking }) => (
          <li key={project.id}>
            <Link
              to={`/${project.key}`}
              title={ok ? t('release.ready') : t('release.projectBlocked', { n: blocking.length })}
              className={cn(chipClass, 'hover:bg-accent')}
            >
              <span className="text-muted-foreground font-mono">{project.key}</span>
              {project.name}
              {ok ? (
                <ShieldCheck className="text-success size-3.5" aria-label={t('release.ready')} />
              ) : (
                <span className="text-destructive-text inline-flex items-center gap-0.5">
                  <ShieldAlert className="size-3.5" aria-hidden />
                  <span aria-hidden>{blocking.length}</span>
                  <span className="sr-only">{t('release.projectBlocked', { n: blocking.length })}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Line>
  )
}

interface Props {
  project: Project | null
  projects: Project[]
}

/** Trạng thái release do server tính (Project@releaseStatus) */
export function ReleaseStatus({ project, projects }: Props) {
  const keys = project ? [project.key] : projects.map((p) => p.key)
  const results = useReleaseStatuses(keys)
  if (results.some((r) => r.isPending)) return <Skeleton className="h-6 w-72" />
  // Không có dữ liệu thì không được kết luận "Sẵn sàng release"
  const statuses = results.map((r) => r.data)
  if (statuses.some((s) => !s)) return null
  return project ? (
    <ProjectRelease {...statuses[0]!} />
  ) : (
    <AllRelease projects={projects} statuses={statuses as Release[]} />
  )
}
