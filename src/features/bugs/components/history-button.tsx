import { History } from 'lucide-react'
import { useState } from 'react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/i18n'
import type { BugHistory, FeatureHistory } from '@/types'
import { HistoryList } from './history-list'

/** Nút 🕘 trên thanh tiến trình → hộp thoại Lịch sử (ẩn khỏi trang cho gọn, ít khi cần xem) */
export function HistoryButton({
  history,
  kind = 'bug',
}: {
  history: (BugHistory | FeatureHistory)[]
  kind?: 'bug' | 'feature'
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Hint label={t('detail.history')}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`${t('detail.history')} (${history.length})`}
          onClick={() => setOpen(true)}
        >
          <History />
        </Button>
      </Hint>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="text-primary size-4" aria-hidden />
            {t('detail.history')}
            <span className="bg-muted text-muted-foreground rounded-sm px-1.5 text-xs font-medium tabular-nums">
              {history.length}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">{t('detail.history')}</DialogDescription>
          <HistoryList history={history} kind={kind} className="max-h-[65dvh]" />
        </DialogContent>
      </Dialog>
    </>
  )
}
