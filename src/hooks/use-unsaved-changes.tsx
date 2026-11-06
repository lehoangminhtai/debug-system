import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useI18n } from '@/i18n'

/**
 * Chặn rời trang khi form có thay đổi chưa lưu: điều hướng trong app (link, Back, nút Hủy) → hỏi xác nhận;
 * tải lại / đóng tab → hộp thoại của trình duyệt. Trả về phần tử dialog cần render.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const { t } = useI18n()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  return (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('leave.desc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>{t('leave.stay')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              // không để Radix đóng dialog: onOpenChange(false) sẽ gọi reset() và huỷ việc rời trang vừa xác nhận
              e.preventDefault()
              blocker.proceed?.()
            }}
          >
            {t('leave.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
