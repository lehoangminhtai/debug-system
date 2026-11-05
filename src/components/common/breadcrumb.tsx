import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
  mono?: boolean
}

/** Đường dẫn vị trí — mục cuối là trang hiện tại (aria-current) */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('nav.breadcrumb')}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {items.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            <li className={cn('min-w-0', c.mono && 'font-mono text-xs')}>
              {c.to ? (
                <Link
                  to={c.to}
                  className="hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
