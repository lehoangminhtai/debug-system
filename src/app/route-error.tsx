import { TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/**
 * Lỗi khi render route hoặc tải chunk lazy thất bại (thường sau khi deploy bản mới).
 * Thay màn hình lỗi mặc định của React Router bằng thông báo dễ hiểu + cách khắc phục.
 */
export function RouteError() {
  const { t } = useI18n()
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={TriangleAlert}
        titleAs="h1"
        title={t('error.boundaryTitle')}
        description={t('error.boundaryDesc')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild>
              <a href="#/all">{t('action.goHome')}</a>
            </Button>
            <Button onClick={() => window.location.reload()}>{t('action.reload')}</Button>
          </div>
        }
      />
    </main>
  )
}
