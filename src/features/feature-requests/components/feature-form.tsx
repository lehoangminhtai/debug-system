import { zodResolver } from '@hookform/resolvers/zod'
import {
  Clock,
  Clapperboard,
  FileText,
  Flag,
  FolderKanban,
  Lightbulb,
  Loader2,
  MonitorSmartphone,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
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
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UNASSIGNED } from '@/features/bugs/bug-form-schema'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { useI18n, type TKey } from '@/i18n'
import { PLATFORM_ICON, PLATFORM_TONE, PRIORITY_META } from '@/lib/meta'
import { useMe, usePeople } from '@/services/queries'
import { PLATFORMS, PRIORITIES, type Feature, type Project } from '@/types'
import { schema, type FeatureFormValues } from '../feature-form-schema'
import { MediaField } from './media-field'

interface Props {
  projects: Project[]
  feature?: Feature
  defaultProjectKey?: string | null
  onSubmit: (values: FeatureFormValues, otp: string) => Promise<unknown>
  onCancel: () => void
}

export function FeatureForm({ projects, feature, defaultProjectKey, onSubmit, onCancel }: Props) {
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
          current: feature.current,
          desired: feature.desired,
          benefit: feature.benefit,
          requester: feature.requester,
          assignee: feature.assignee ?? UNASSIGNED,
          media: feature.media.map(({ id, type, url, caption, size }) => ({ id, type, url, caption, size })),
        }
      : {
          projectId: String(projects.find((p) => p.key === defaultProjectKey)?.id ?? ''),
          title: '',
          platform: [],
          current: '',
          desired: '',
          benefit: '',
          requester: currentUser,
          assignee: UNASSIGNED,
          media: [],
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

  return (
    <form onSubmit={form.handleSubmit((values) => setPending(values))} noValidate className="flex flex-col gap-5">
      {leaveDialog}
      <OtpDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} onSubmit={sendWithOtp} />

      <Section id="general" icon={FileText} title={t('form.general')}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-12">
            <Field
              id="feature-title"
              className="md:col-span-8"
              label={t('field.title')}
              icon={Type}
              error={errors.title?.message}
              required
            >
              {(c) => (
                <Input {...c} {...register('title')} maxLength={200} placeholder={t('feature.titlePlaceholder')} />
              )}
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
            required
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

          <FieldSet
            id="feature-priority"
            label={t('field.priority')}
            icon={Flag}
            error={errors.priority?.message}
            required
          >
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

      <Section id="content" icon={Lightbulb} title={t('feature.content')} description={t('feature.contentDesc')}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="feature-current"
              label={t('field.current')}
              icon={Clock}
              error={errors.current?.message}
              required
            >
              {(c) => (
                <Textarea
                  {...c}
                  {...register('current')}
                  rows={4}
                  maxLength={2000}
                  placeholder={t('feature.currentPlaceholder')}
                />
              )}
            </Field>
            <Field
              id="feature-desired"
              label={t('field.desired')}
              icon={Sparkles}
              error={errors.desired?.message}
              required
            >
              {(c) => (
                <Textarea
                  {...c}
                  {...register('desired')}
                  rows={4}
                  maxLength={2000}
                  placeholder={t('feature.desiredPlaceholder')}
                />
              )}
            </Field>
          </div>
          <Field id="feature-benefit" label={t('field.benefit')} icon={TrendingUp} error={errors.benefit?.message}>
            {(c) => (
              <Textarea
                {...c}
                {...register('benefit')}
                rows={2}
                maxLength={1000}
                placeholder={t('feature.benefitPlaceholder')}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        id="media"
        icon={Clapperboard}
        title={
          <span className="flex items-center gap-2">
            {t('field.media')}
            <span className="bg-muted text-muted-foreground rounded-sm px-1.5 text-xs font-medium">
              {t('form.recommended')}
            </span>
          </span>
        }
        description={<span id="feature-media-hint">{t('feature.mediaDesc')}</span>}
      >
        <Controller
          control={control}
          name="media"
          render={({ field }) => (
            <MediaField
              id="feature-media"
              value={field.value}
              onChange={field.onChange}
              describedBy="feature-media-hint"
              invalid={!!errors.media}
            />
          )}
        />
        {errors.media?.message && (
          <p role="alert" className="text-destructive-text mt-2 text-xs">
            {t(errors.media.message as TKey)}
          </p>
        )}
      </Section>

      <Section id="other" icon={SlidersHorizontal} title={t('form.other')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="feature-requester"
            label={t('field.requester')}
            icon={User}
            error={errors.requester?.message}
            required
          >
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

      <div className="bg-card/95 sticky bottom-0 z-10 -mx-4 -mb-4 flex justify-end gap-2 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 xl:-mx-8 xl:px-8">
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
