import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { PAGE_SIZE } from '@/features/items/hooks/use-item-filters'

/** Phân trang gọn cho thanh công cụ phía trên bảng: "1–10 / 13  ‹ ›" */
export function TablePager({
  page,
  total,
  onPageChange,
}: {
  page: number
  total: number
  onPageChange: (page: number) => void
}) {
  const { t } = useI18n()
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const from = page * PAGE_SIZE + 1
  const to = Math.min(total, from + PAGE_SIZE - 1)
  return (
    <nav aria-label={t('table.pagination')} className="ml-auto flex items-center gap-2">
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
        {t('table.range', { from, to, total })}
      </p>
      <Hint label={t('action.prev')}>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('action.prev')}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
      </Hint>
      <Hint label={t('action.next')}>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('action.next')}
          disabled={page >= pages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </Hint>
    </nav>
  )
}
