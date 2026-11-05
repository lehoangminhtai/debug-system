import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'

export function NotFoundPage({ title }: { title?: string }) {
  const { t } = useI18n()
  const heading = title ?? t('error.notFound')
  useDocumentTitle(heading)
  return (
    <EmptyState
      icon={FileQuestion}
      title={heading}
      description={t('error.notFoundDesc')}
      className="py-24"
      titleAs="h1"
      action={
        <Button asChild variant="outline">
          <Link to="/all">{t('action.backToList')}</Link>
        </Button>
      }
    />
  )
}
