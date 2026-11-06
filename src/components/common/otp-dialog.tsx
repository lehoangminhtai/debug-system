import { KeyRound, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n'
import { useOtpFlow } from '@/hooks/use-otp-flow'

export function OtpInput({
  value,
  onChange,
  error,
  disabled,
  autoFocus = true,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder="••••••"
        aria-label={t('login.otp')}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? 'otp-error' : undefined}
        className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
      />
      {error && (
        <p id="otp-error" role="alert" className="text-destructive-text text-center text-xs">
          {error}
        </p>
      )}
    </div>
  )
}

function Body({ onSubmit, onClose }: { onSubmit: (otp: string) => Promise<unknown>; onClose: () => void }) {
  const { t } = useI18n()
  const { otp, error, busy, change, submit } = useOtpFlow(onSubmit, onClose)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="text-primary size-5" aria-hidden />
          {t('otp.title')}
        </DialogTitle>
        <DialogDescription>{t('otp.desc')}</DialogDescription>
      </DialogHeader>
      <OtpInput value={otp} onChange={change} error={error} disabled={busy} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" disabled={busy || otp.length !== 6} aria-busy={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {t('otp.confirm')}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Hộp thoại xác nhận thao tác lưu/xoá bằng OTP (doc API §12) */
export function OtpDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (otp: string) => Promise<unknown>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <Body onSubmit={onSubmit} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Nút "Xoá" + hộp thoại xác nhận có ô OTP (bug, dự án, đề xuất tính năng).
 * `confirmCode`: bắt người dùng gõ lại mã (vd. FF-007) trước khi xoá; giá trị gõ được truyền vào `onConfirm` làm `confirm`.
 */
export function OtpDeleteButton({
  title,
  description,
  confirmLabel,
  confirmCode,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmCode?: string
  onConfirm: (otp: string, confirm: string) => Promise<unknown>
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  // so khớp không phân biệt hoa thường, bỏ khoảng trắng (server kiểm lại)
  const matched = !confirmCode || typed.trim().toLowerCase() === confirmCode.toLowerCase()
  const flow = useOtpFlow(
    (otp) => onConfirm(otp, typed.trim()),
    () => setOpen(false),
    matched,
  )
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setTyped('')
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive-text hover:text-destructive-text">
          <Trash2 aria-hidden />
          {t('action.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmCode && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              {t('delete.typeToConfirm', { code: confirmCode })}
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
              disabled={flow.busy}
              className="font-mono"
              onPaste={(e) => e.preventDefault()} // phải tự gõ lại, không dán
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">{t('otp.desc')}</p>
          <OtpInput
            value={flow.otp}
            onChange={flow.change}
            error={flow.error}
            disabled={flow.busy}
            autoFocus={!confirmCode}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={flow.busy}>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={flow.busy || flow.otp.length !== 6 || !matched}
            onClick={(e) => {
              e.preventDefault() // giữ hộp thoại mở để báo lỗi OTP; flow tự đóng khi xong
              void flow.submit()
            }}
          >
            {flow.busy && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
