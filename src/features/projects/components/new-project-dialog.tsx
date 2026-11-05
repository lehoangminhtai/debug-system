import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { PROJECT_KEY_PATTERN } from '@/lib/rules'
import { ApiError } from '@/services/api'
import { errorMessage, useCreateProject } from '@/services/queries'

const schema = z.object({
  key: z.string().trim().regex(PROJECT_KEY_PATTERN, 'v.keyFormat'),
  name: z.string().trim().min(1, 'v.required').max(60, 'v.tooLong|60'),
  description: z.string().trim().min(1, 'v.required').max(500, 'v.tooLong|500'),
})
type Values = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  existingKeys: string[]
}

export function NewProjectDialog({ open, onOpenChange, onCreated, existingKeys }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const create = useCreateProject()
  const form = useForm<Values>({
    resolver: zodResolver(
      schema.refine((v) => !existingKeys.includes(v.key), { path: ['key'], message: 'error.duplicate_key' }),
    ),
    defaultValues: { key: '', name: '', description: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    create.mutateAsync(values).then(
      (project) => {
        toast.success(t('toast.projectCreated', { name: project.name }))
        onOpenChange(false)
        form.reset()
        onCreated?.()
        navigate(`/${project.key}`)
      },
      (error) => {
        if (error instanceof ApiError && (error.code === 'duplicate_key' || error.code === 'invalid_key'))
          form.setError('key', { message: `error.${error.code}` }, { shouldFocus: true })
        else toast.error(errorMessage(error))
      },
    ),
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
            hint={t('project.keyHint')}
            error={errors.key?.message}
            required
          >
            {(c) => (
              <Input
                {...c}
                {...keyField}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                  return keyField.onChange(e)
                }}
                maxLength={4}
                autoComplete="off"
                className="w-28 font-mono uppercase"
              />
            )}
          </Field>
          <Field id="project-name" label={t('field.name')} error={errors.name?.message} required>
            {(c) => <Input {...c} {...form.register('name')} placeholder={t('project.namePlaceholder')} />}
          </Field>

          <Field
            id="project-description"
            label={t('field.description')}
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
      </DialogContent>
    </Dialog>
  )
}
