import { CircleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** 'h1' khi trạng thái này là toàn bộ nội dung trang */
  titleAs?: 'h1' | 'h2' | 'p'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  titleAs: Title = 'p',
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="bg-card mb-3 flex size-10 items-center justify-center rounded-lg border">
        <Icon className="text-muted-foreground size-5" aria-hidden />
      </div>
      <Title className={Title === 'h1' ? 'text-xl font-semibold' : 'font-medium'}>{title}</Title>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  onRetry,
  className,
  titleAs,
}: {
  onRetry: () => void
  className?: string
  titleAs?: EmptyStateProps['titleAs']
}) {
  const { t } = useI18n()
  return (
    <div role="alert">
      <EmptyState
        icon={CircleAlert}
        title={t('error.load')}
        titleAs={titleAs}
        description={t('error.loadDesc')}
        className={className}
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('action.retry')}
          </Button>
        }
      />
    </div>
  )
}
