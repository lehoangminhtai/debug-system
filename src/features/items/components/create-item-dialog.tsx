import { XIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toBugInput, type BugFormValues } from '@/features/bugs/bug-form-schema'
import { BugForm } from '@/features/bugs/components/bug-form'
import { FeatureForm } from '@/features/feature-requests/components/feature-form'
import { toFeatureInput, type FeatureFormValues } from '@/features/feature-requests/feature-form-schema'
import { useI18n } from '@/i18n'
import { useCreateBug, useCreateFeature } from '@/services/queries'
import type { Project } from '@/types'
import type { ItemType } from '../hooks/use-item-filters'
import { TypePicker } from './type-picker'

interface Props {
  /** null = đóng; còn lại = mở với loại chọn sẵn */
  openType: ItemType | null
  onClose: () => void
  projects: Project[]
  /** Đang ở trang dự án → khoá dự án trong form */
  projectKey?: string
}

/**
 * Modal "Tạo mới": chọn Bug | Tính năng mong muốn ngay trong modal. Cả 2 form cùng được giữ (form không chọn
 * bị ẩn) → đổi loại không mất nội dung. Lưu xong: đóng modal, danh sách tự tải lại (mutation làm mới cache),
 * toast có nút "Xem" để mở chi tiết.
 */
export function CreateItemDialog({ openType, onClose, projects, projectKey }: Props) {
  const open = openType !== null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Chỉ dựng khi mở → mỗi lần mở là form mới */}
      {open && <Body initialType={openType} onClose={onClose} projects={projects} projectKey={projectKey} />}
    </Dialog>
  )
}

function Body({
  initialType,
  onClose,
  projects,
  projectKey,
}: {
  initialType: ItemType
  onClose: () => void
  projects: Project[]
  projectKey?: string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [type, setType] = useState<ItemType>(initialType)
  const [dirty, setDirty] = useState({ bug: false, feature: false })
  const [confirmClose, setConfirmClose] = useState(false)
  const createBug = useCreateBug()
  const createFeature = useCreateFeature()

  const onBugDirty = useCallback((d: boolean) => setDirty((s) => ({ ...s, bug: d })), [])
  const onFeatureDirty = useCallback((d: boolean) => setDirty((s) => ({ ...s, feature: d })), [])
  // Đóng khi đang nhập dở → hỏi trước
  const requestClose = () => (dirty.bug || dirty.feature ? setConfirmClose(true) : onClose())

  const done = (href: string, message: string) => {
    onClose()
    toast.success(message, { action: { label: t('action.viewItem'), onClick: () => navigate(href) } })
  }

  // Lỗi do MutationCache toast chung; lỗi OTP hiện trong hộp thoại OTP của form
  const submitBug = (values: BugFormValues, otp: string) =>
    createBug
      .mutateAsync({ input: toBugInput(values), otp })
      .then((bug) => done(`/bugs/${bug.code}`, t('toast.bugCreated', { code: bug.code })))
  const submitFeature = (values: FeatureFormValues, otp: string) =>
    createFeature
      .mutateAsync({ input: toFeatureInput(values), otp })
      .then((f) => done(`/features/${f.code}`, t('toast.featureCreated', { code: f.code })))

  return (
    <DialogContent
      // pb-0: thanh nút sticky cuối form phải sát đáy modal — sticky bám theo vùng cuộn TRỪ padding,
      // nên còn padding đáy thì khi cuộn thanh nút lơ lửng cách đáy 24px
      className="max-h-[92dvh] overflow-y-auto pb-0 sm:max-w-4xl"
      showCloseButton={false}
      // Esc / bấm ra ngoài / nút X đều đi qua requestClose
      onEscapeKeyDown={(e) => {
        e.preventDefault()
        requestClose()
      }}
      onInteractOutside={(e) => {
        e.preventDefault()
        requestClose()
      }}
    >
      {/* Nút X riêng: đi qua requestClose để hỏi khi đang nhập dở */}
      <button
        type="button"
        onClick={requestClose}
        aria-label={t('action.cancel')}
        className="ring-offset-card focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
      <DialogHeader>
        <DialogTitle>{t('form.newItemTitle')}</DialogTitle>
        <DialogDescription className="sr-only">{t('form.chooseType')}</DialogDescription>
      </DialogHeader>
      <TypePicker value={type} onChange={setType} />
      <div hidden={type !== 'bug'}>
        <BugForm
          inDialog
          projects={projects}
          defaultProjectKey={projectKey}
          onSubmit={submitBug}
          onCancel={requestClose}
          onDirtyChange={onBugDirty}
        />
      </div>
      <div hidden={type !== 'feature'}>
        <FeatureForm
          inDialog
          projects={projects}
          defaultProjectKey={projectKey}
          onSubmit={submitFeature}
          onCancel={requestClose}
          onDirtyChange={onFeatureDirty}
        />
      </div>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('create.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('leave.desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>{t('leave.stay')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              {t('create.discardConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  )
}
