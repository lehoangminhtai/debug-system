import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Loader2, Plus, ShieldAlert, Target, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { Field, FieldSet } from '@/components/common/field'
import { Hint } from '@/components/common/hint'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { useI18n } from '@/i18n'
import { PLATFORM_ICON, SEVERITY_META, TONE_TEXT } from '@/lib/meta'
import { cn } from '@/lib/utils'
import { MEMBERS, useCurrentUser } from '@/services/current-user'
import { PLATFORMS, SEVERITIES, type Bug, type Project } from '@/types'
import { UNASSIGNED, schema, type BugFormValues } from '../bug-form-schema'
import { ImageField } from './image-field'

/** Thẻ radio dùng <input type="radio"> gốc: phím mũi tên, focus khi lỗi và RHF register hoạt động sẵn */
function RadioCard({
  registration,
  value,
  title,
  hint,
  icon,
  describedBy,
}: {
  registration: UseFormRegisterReturn
  value: string
  title: string
  hint?: string
  icon?: ReactNode
  describedBy?: string
}) {
  return (
    <label
      className={cn(
        'bg-card flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-150',
        'hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-light/40',
        'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
      )}
    >
      <input type="radio" value={value} {...registration} aria-describedby={describedBy} className="peer sr-only" />
      <span
        aria-hidden
        className="bg-card border-input peer-checked:border-primary mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border peer-checked:border-[5px]"
      />
      {icon}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
      </span>
    </label>
  )
}

interface Props {
  projects: Project[]
  bug?: Bug
  defaultProjectKey?: string | null
  /** Trả về promise: form ở trạng thái đang gửi (nút khóa, không chặn điều hướng) đến khi promise kết thúc */
  onSubmit: (values: BugFormValues) => Promise<unknown>
  onCancel: () => void
}

export function BugForm({ projects, bug, defaultProjectKey, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const currentUser = useCurrentUser()
  const isEdit = !!bug
  // Dự án lấy theo ngữ cảnh (bug đang sửa / ?project=) → khóa. Chỉ cho chọn khi vào từ "Tất cả dự án" (chưa có dự án).
  const projectLocked = isEdit || projects.some((p) => p.key === defaultProjectKey)

  const form = useForm<BugFormValues>({
    resolver: zodResolver(schema),
    defaultValues: bug
      ? {
          projectId: String(bug.projectId),
          title: bug.title,
          platform: bug.platform,
          isCore: bug.isCore ? 'yes' : 'no',
          severity: bug.severity,
          steps: bug.steps.split('\n').map((value) => ({ value })),
          expected: bug.expected,
          actual: bug.actual,
          note: bug.note,
          reporter: bug.reporter,
          assignee: bug.assignee ?? UNASSIGNED,
          images: bug.images.map(({ url, caption }) => ({ url, caption })),
        }
      : {
          projectId: String(projects.find((p) => p.key === defaultProjectKey)?.id ?? ''),
          title: '',
          steps: [{ value: '' }, { value: '' }],
          expected: '',
          actual: '',
          note: '',
          reporter: currentUser,
          assignee: UNASSIGNED,
          images: [],
        },
  })
  const { register, control, formState } = form
  const submitting = formState.isSubmitting
  // Có thay đổi chưa lưu → hỏi trước khi rời trang; khi đang gửi thì cho phép điều hướng sau khi lưu xong
  const leaveDialog = useUnsavedChangesGuard(formState.isDirty && !submitting)
  const { errors } = formState
  const steps = useFieldArray({ control, name: 'steps' })

  const [projectId, isCore, severity] = useWatch({ control, name: ['projectId', 'isCore', 'severity'] })
  const project = projects.find((p) => String(p.id) === projectId)
  const handling =
    !isCore || !severity
      ? null
      : isCore === 'yes' || severity === 'critical'
        ? 'mustFix'
        : severity === 'low'
          ? 'later'
          : 'whenPossible'

  const stepsError = errors.steps?.message ?? errors.steps?.root?.message

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {leaveDialog}
      {/* Thông tin chung */}
      <Section id="general" title={t('form.general')}>
        <div className="flex flex-col gap-4">
          {/* Tiêu đề (8/12) + Dự án (4/12) cùng hàng; mobile xếp dọc */}
          <div className="grid gap-4 md:grid-cols-12">
            <Field
              id="bug-title"
              className="md:col-span-8"
              label={t('field.title')}
              error={errors.title?.message}
              required
            >
              {(c) => <Input {...c} {...register('title')} maxLength={200} placeholder={t('form.titlePlaceholder')} />}
            </Field>
            <Field
              id="bug-project"
              className="md:col-span-4"
              label={t('field.project')}
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

          <FieldSet id="bug-platform" label={t('field.platform')} error={errors.platform?.message} required>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-3">
                {PLATFORMS.map((p) => {
                  const Icon = PLATFORM_ICON[p]
                  return (
                    <RadioCard
                      key={p}
                      registration={register('platform')}
                      value={p}
                      title={t(`platform.${p}`)}
                      icon={<Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />}
                      describedBy={describedBy}
                    />
                  )
                })}
              </div>
            )}
          </FieldSet>
        </div>
      </Section>

      {/* Phân loại */}
      <Section id="classify" title={t('form.classify')} description={t('form.classifyDesc')}>
        <div className="flex flex-col gap-5">
          {project && (
            <div className="bg-muted flex gap-2.5 rounded-md p-3 text-sm">
              <Target className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{t('form.coreFeatures', { name: project.name })}</p>
                <p className="text-muted-foreground break-words">{project.description}</p>
              </div>
            </div>
          )}

          <FieldSet id="bug-core" label={t('field.isCore')} error={errors.isCore?.message} required>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  registration={register('isCore')}
                  value="yes"
                  title={t('core.yes')}
                  hint={t('core.yesHint')}
                  describedBy={describedBy}
                />
                <RadioCard
                  registration={register('isCore')}
                  value="no"
                  title={t('core.no')}
                  hint={t('core.noHint')}
                  describedBy={describedBy}
                />
              </div>
            )}
          </FieldSet>

          <FieldSet id="bug-severity" label={t('field.severity')} error={errors.severity?.message} required>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {SEVERITIES.map((s) => {
                  const { icon: Icon, tone } = SEVERITY_META[s]
                  return (
                    <RadioCard
                      key={s}
                      registration={register('severity')}
                      value={s}
                      title={t(`severity.${s}`)}
                      hint={t(`severity.${s}Hint`)}
                      icon={<Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} aria-hidden />}
                      describedBy={describedBy}
                    />
                  )
                })}
              </div>
            )}
          </FieldSet>

          <div
            aria-live="polite"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm',
              handling === 'mustFix'
                ? 'bg-destructive-bg text-destructive-text font-medium'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {handling === 'mustFix' ? (
              <ShieldAlert className="size-4 shrink-0" aria-hidden />
            ) : (
              <Clock className="size-4 shrink-0" aria-hidden />
            )}
            <span>
              {handling ? (
                <>
                  <span className="sr-only">{t('field.handling')}: </span>
                  {t(`handling.${handling}`)}
                </>
              ) : (
                t('handling.pending')
              )}
            </span>
          </div>
        </div>
      </Section>

      {/* Tái tạo */}
      <Section id="repro" title={t('form.repro')} description={t('form.reproDesc')}>
        <div className="flex flex-col gap-4">
          <FieldSet id="bug-steps" label={t('field.steps')} error={stepsError} required>
            {(describedBy) => (
              <div className="flex flex-col gap-2">
                <ol className="flex flex-col gap-2">
                  {steps.fields.map((f, i) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                      >
                        {i + 1}
                      </span>
                      <Input
                        {...register(`steps.${i}.value`, {
                          // lỗi "ít nhất một bước" nằm ở cấp mảng → kiểm tra lại cả mảng khi gõ
                          onChange: () => stepsError && form.trigger('steps'),
                        })}
                        aria-label={t('form.stepPlaceholder', { n: i + 1 })}
                        aria-describedby={describedBy}
                        aria-invalid={!!errors.steps?.[i]?.value || (!!stepsError && i === 0) || undefined}
                        placeholder={t('form.stepPlaceholder', { n: i + 1 })}
                        maxLength={500}
                        onKeyDown={(e) => {
                          // Enter ở bước cuối → thêm bước mới
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            if (i === steps.fields.length - 1) steps.append({ value: '' })
                            else form.setFocus(`steps.${i + 1}.value`)
                          }
                        }}
                      />
                      <Hint label={t('action.removeStep', { n: i + 1 })}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground shrink-0"
                          aria-label={t('action.removeStep', { n: i + 1 })}
                          disabled={steps.fields.length === 1}
                          onClick={() => steps.remove(i)}
                        >
                          <X />
                        </Button>
                      </Hint>
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => steps.append({ value: '' })}
                  disabled={steps.fields.length >= 30}
                >
                  <Plus aria-hidden />
                  {t('action.addStep')}
                </Button>
              </div>
            )}
          </FieldSet>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="bug-expected" label={t('field.expected')} error={errors.expected?.message} required>
              {(c) => (
                <Textarea {...c} {...register('expected')} rows={3} placeholder={t('form.expectedPlaceholder')} />
              )}
            </Field>
            <Field id="bug-actual" label={t('field.actual')} error={errors.actual?.message} required>
              {(c) => <Textarea {...c} {...register('actual')} rows={3} placeholder={t('form.actualPlaceholder')} />}
            </Field>
          </div>
        </div>
      </Section>

      {/* Ảnh minh chứng */}
      <Section
        id="images"
        title={
          <span className="flex items-center gap-2">
            {t('field.images')}
            <span className="bg-muted text-muted-foreground rounded-sm px-1.5 text-xs font-medium">
              {t('form.recommended')}
            </span>
          </span>
        }
        description={<span id="bug-images-hint">{t('form.imagesDesc')}</span>}
      >
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageField id="bug-images" value={field.value} onChange={field.onChange} describedBy="bug-images-hint" />
          )}
        />
      </Section>

      {/* Khác */}
      <Section id="other" title={t('form.other')}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bug-reporter" label={t('field.reporter')} error={errors.reporter?.message} required>
              {(c) => (
                <Controller
                  control={control}
                  name="reporter"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...c} ref={field.ref} className="w-full">
                        <SelectValue placeholder={t('form.selectPerson')} />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
            <Field id="bug-assignee" label={t('field.assignee')}>
              {(c) => (
                <Controller
                  control={control}
                  name="assignee"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...c} ref={field.ref} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>{t('table.unassigned')}</SelectItem>
                        {MEMBERS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
          </div>
          <Field id="bug-note" label={t('field.note')} error={errors.note?.message}>
            {(c) => <Textarea {...c} {...register('note')} rows={3} placeholder={t('form.notePlaceholder')} />}
          </Field>
        </div>
      </Section>

      <div className="bg-card/95 sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {isEdit ? t('action.save') : t('action.reportBug')}
        </Button>
      </div>
    </form>
  )
}
