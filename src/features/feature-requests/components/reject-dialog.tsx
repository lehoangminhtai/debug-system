import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'
import type { Feature } from '@/types'

/** Từ chối bắt buộc có lý do (spec §4) */
export function RejectDialog({
  feature,
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  feature: Feature
  open: boolean
  onOpenChange: (o: boolean) => void
  onConfirm: (reason: string) => void
  busy: boolean
}) {
  const { t } = useI18n()
  const [reason, setReason] = useState(feature.rejectReason ?? '')
  const [error, setError] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!reason.trim()) return setError(true)
            onConfirm(reason.trim())
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('feature.rejectTitle', { code: feature.code })}</DialogTitle>
            <DialogDescription>{t('feature.rejectDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">{t('field.rejectReason')}</Label>
            <Textarea
              id="reject-reason"
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(false)
              }}
              placeholder={t('feature.rejectPlaceholder')}
              aria-invalid={error || undefined}
              aria-describedby={error ? 'reject-reason-error' : undefined}
            />
            {error && (
              <p id="reject-reason-error" className="text-destructive-text text-xs">
                {t('error.reject_reason_required')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy} aria-busy={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('feature.reject')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
