import { zodResolver } from '@hookform/resolvers/zod'
import {
  FileText,
  Flag,
  FolderKanban,
  Lightbulb,
  Loader2,
  MonitorSmartphone,
  SlidersHorizontal,
  Type,
  User,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Field, FieldSet } from '@/components/common/field'
import { OtpDialog } from '@/components/common/otp-dialog'
import { PersonSelect } from '@/components/common/person-select'
import { RadioCard } from '@/components/common/radio-card'
import { RichEditor } from '@/components/common/rich-text'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UNASSIGNED } from '@/features/bugs/bug-form-schema'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { PLATFORM_ICON, PLATFORM_TONE, PRIORITY_META } from '@/lib/meta'
import { useMe, usePeople } from '@/services/queries'
import { PLATFORMS, PRIORITIES, type Feature, type Project } from '@/types'
import { schema, type FeatureFormValues } from '../feature-form-schema'

interface Props {
  projects: Project[]
  feature?: Feature
  defaultProjectKey?: string | null
  onSubmit: (values: FeatureFormValues, otp: string) => Promise<unknown>
  onCancel: () => void
  /** Form nằm trong modal tạo mới: footer theo lề modal */
  inDialog?: boolean
  /** Báo form có thay đổi chưa lưu (modal hỏi trước khi đóng) */
  onDirtyChange?: (dirty: boolean) => void
}

export function FeatureForm({
  projects,
  feature,
  defaultProjectKey,
  onSubmit,
  onCancel,
  inDialog = false,
  onDirtyChange,
}: Props) {
  const { t } = useI18n()
  const currentUser = useMe().data?.name ?? ''
  const people = usePeople(currentUser, feature?.requester, feature?.assignee)
  const isEdit = !!feature
  const projectLocked = isEdit || projects.some((p) => p.key === defaultProjectKey)

  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(schema),
    defaultValues: feature
      ? {
          projectId: String(feature.projectId),
          title: feature.title,
          platform: feature.platform,
          priority: feature.priority,
          content: feature.content,
          requester: feature.requester,
          assignee: feature.assignee ?? UNASSIGNED,
        }
      : {
          projectId: String(projects.find((p) => p.key === defaultProjectKey)?.id ?? ''),
          title: '',
          platform: [],
          content: '',
          requester: currentUser,
          assignee: UNASSIGNED,
        },
  })
  const { register, control, formState, setValue, getValues } = form
  const { errors } = formState
  // Người đề xuất mặc định = người đang đăng nhập (me có thể về sau khi form đã mở)
  useEffect(() => {
    if (!isEdit && currentUser && !getValues('requester')) setValue('requester', currentUser)
  }, [isEdit, currentUser, getValues, setValue])

  // Form hợp lệ → hỏi OTP rồi mới gửi
  const [pending, setPending] = useState<FeatureFormValues | null>(null)
  const [sending, setSending] = useState(false)
  const sendWithOtp = async (otp: string) => {
    setSending(true)
    try {
      await onSubmit(pending!, otp)
    } finally {
      setSending(false)
    }
  }
  const leaveDialog = useUnsavedChangesGuard(formState.isDirty && !sending)
  const isDirty = formState.isDirty
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange])

  return (
    <form onSubmit={form.handleSubmit((values) => setPending(values))} noValidate className="flex flex-col gap-5">
      {leaveDialog}
      <OtpDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} onSubmit={sendWithOtp} />

      <Section id="feature-general" icon={FileText} title={t('form.general')}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-12">
            <Field
              id="feature-title"
              className="md:col-span-8"
              label={t('field.title')}
              icon={Type}
              error={errors.title?.message}
            >
              {(c) => <Input {...c} {...register('title')} placeholder={t('feature.titlePlaceholder')} />}
            </Field>
            <Field
              id="feature-project"
              className="md:col-span-4"
              label={t('field.project')}
              icon={FolderKanban}
              error={errors.projectId?.message}
              required
            >
              {(c) => (
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={projectLocked}>
                      <SelectTrigger
                        {...c}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        className="disabled:bg-muted disabled:text-foreground w-full disabled:opacity-100"
                      >
                        <SelectValue placeholder={t('form.selectProject')} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            <span className="text-muted-foreground font-mono text-xs">{p.key}</span>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
          </div>

          <FieldSet
            id="feature-platform"
            label={t('field.platform')}
            icon={MonitorSmartphone}
            error={errors.platform?.message}
          >
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PLATFORMS.map((p) => (
                  <RadioCard
                    key={p}
                    type="checkbox"
                    registration={register('platform')}
                    value={p}
                    title={t(`platform.${p}`)}
                    icon={PLATFORM_ICON[p]}
                    tone={PLATFORM_TONE[p]}
                    describedBy={describedBy}
                  />
                ))}
              </div>
            )}
          </FieldSet>

          <FieldSet id="feature-priority" label={t('field.priority')} icon={Flag} error={errors.priority?.message}>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-3">
                {PRIORITIES.map((p) => (
                  <RadioCard
                    key={p}
                    registration={register('priority')}
                    value={p}
                    title={t(`priority.${p}`)}
                    hint={t(`priority.${p}Hint`)}
                    icon={PRIORITY_META[p].icon}
                    tone={PRIORITY_META[p].tone}
                    describedBy={describedBy}
                  />
                ))}
              </div>
            )}
          </FieldSet>
        </div>
      </Section>

      {/* Nội dung: hiện tại, mong muốn, lợi ích, ảnh/video/tệp — một ô rich text */}
      <Section
        id="feature-content"
        icon={Lightbulb}
        title={t('feature.content')}
        description={<span id="feature-content-hint">{t('feature.contentDesc')}</span>}
      >
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <RichEditor
              id="feature-content-editor"
              value={field.value}
              onChange={field.onChange}
              placeholder={t('feature.contentPlaceholder')}
              labelledBy="feature-content-title"
              describedBy="feature-content-hint"
            />
          )}
        />
      </Section>

      <Section id="feature-other" icon={SlidersHorizontal} title={t('form.other')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="feature-requester" label={t('field.requester')} icon={User} error={errors.requester?.message}>
            {(c) => (
              <Controller
                control={control}
                name="requester"
                render={({ field }) => (
                  <PersonSelect
                    {...c}
                    ref={field.ref}
                    value={field.value}
                    onValueChange={field.onChange}
                    people={people}
                    disabled // người đề xuất = người đang đăng nhập, giống người báo bug
                    className="disabled:bg-muted disabled:text-foreground disabled:opacity-100"
                  />
                )}
              />
            )}
          </Field>
          <Field id="feature-assignee" label={t('field.owner')} icon={Wrench}>
            {(c) => (
              <Controller
                control={control}
                name="assignee"
                render={({ field }) => (
                  <PersonSelect
                    {...c}
                    ref={field.ref}
                    value={field.value}
                    onValueChange={field.onChange}
                    people={people}
                    none={{ value: UNASSIGNED, label: t('table.unassigned') }}
                  />
                )}
              />
            )}
          </Field>
        </div>
      </Section>

      <div
        className={cn(
          'bg-card/95 sticky bottom-0 z-10 flex justify-end gap-2 border-t py-3 backdrop-blur',
          // trong modal: bám đúng lề p-6 của DialogContent; trên trang: bám lề của layout
          inDialog ? '-mx-6 rounded-b-xl px-6' : '-mx-4 -mb-4 px-4 sm:-mx-6 sm:-mb-6 sm:px-6 xl:-mx-8 xl:px-8',
        )}
      >
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" disabled={sending} aria-busy={sending}>
          {sending && <Loader2 className="animate-spin" aria-hidden />}
          {isEdit ? t('action.save') : t('feature.new')}
        </Button>
      </div>
    </form>
  )
}
