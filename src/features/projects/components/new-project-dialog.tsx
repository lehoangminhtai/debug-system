import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, FolderKanban, Hash, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field } from '@/components/common/field'
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
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'
import { OtpDialog } from '@/components/common/otp-dialog'
import { ApiError } from '@/services/api'
import { errorMessage, useCreateProject } from '@/services/queries'

const schema = z.object({
  // Không giới hạn số ký tự; định dạng (chữ + số) do server kiểm tra (invalid_key / duplicate_key)
  key: z.string().trim().min(1, 'v.required'),
  name: z.string().trim().min(1, 'v.required'),
  description: z.string().trim().min(1, 'v.required'),
})
type Values = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const create = useCreateProject()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', name: '', description: '' },
  })
  const { errors } = form.formState

  // Hợp lệ → hỏi OTP rồi mới gửi (doc API §12)
  const [pending, setPending] = useState<Values | null>(null)
  const onSubmit = form.handleSubmit((values) => setPending(values))
  const createWithOtp = (otp: string) =>
    create.mutateAsync({ input: pending!, otp }).then(
      (project) => {
        toast.success(t('toast.projectCreated', { name: project.name }))
        onOpenChange(false)
        form.reset()
        onCreated?.()
        navigate(`/${project.key}`)
      },
      (error) => {
        if (error instanceof ApiError && error.code.startsWith('otp_')) throw error // báo lỗi ngay trong hộp thoại OTP
        if (error instanceof ApiError && (error.code === 'duplicate_key' || error.code === 'invalid_key'))
          form.setError('key', { message: `error.${error.code}` }, { shouldFocus: true })
        else toast.error(errorMessage(error))
      },
    )

  const keyField = form.register('key')

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) form.reset()
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('project.title')}</DialogTitle>
            <DialogDescription>{t('project.desc')}</DialogDescription>
          </DialogHeader>

          <Field
            id="project-key"
            label={t('field.key')}
            icon={Hash}
            hint={t('project.keyHint')}
            error={errors.key?.message}
            required
          >
            {(c) => (
              <Input
                {...c}
                {...keyField}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase()
                  return keyField.onChange(e)
                }}
                autoComplete="off"
                className="w-full font-mono sm:w-60"
              />
            )}
          </Field>
          <Field id="project-name" label={t('field.name')} icon={FolderKanban} error={errors.name?.message} required>
            {(c) => <Input {...c} {...form.register('name')} placeholder={t('project.namePlaceholder')} />}
          </Field>

          <Field
            id="project-description"
            label={t('field.description')}
            icon={FileText}
            hint={t('project.descHint')}
            error={errors.description?.message}
            required
          >
            {(c) => (
              <Textarea {...c} {...form.register('description')} rows={3} placeholder={t('project.descPlaceholder')} />
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {t('action.createProject')}
            </Button>
          </DialogFooter>
        </form>
        <OtpDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} onSubmit={createWithOtp} />
      </DialogContent>
    </Dialog>
  )
}
