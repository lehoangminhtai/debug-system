import { zodResolver } from '@hookform/resolvers/zod'
import {
  CircleCheck,
  CircleX,
  Clock,
  Flame,
  FolderKanban,
  MonitorSmartphone,
  StickyNote,
  Type,
  User,
  Wrench,
  FileText,
  Image as ImageIcon,
  ListOrdered,
  Loader2,
  CircleOff,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Tags,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Field, FieldSet } from '@/components/common/field'
import { RadioCard } from '@/components/common/radio-card'
import { Hint } from '@/components/common/hint'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { useI18n } from '@/i18n'
import { PLATFORM_ICON, PLATFORM_TONE, SEVERITY_META } from '@/lib/meta'
import { cn } from '@/lib/utils'
import { OtpDialog } from '@/components/common/otp-dialog'
import { PersonSelect } from '@/components/common/person-select'
import { useMe, usePeople } from '@/services/queries'
import { PLATFORMS, SEVERITIES, type Bug, type Project } from '@/types'
import { UNASSIGNED, schema, type BugFormValues } from '../bug-form-schema'
import { MediaField } from '@/components/common/media-field'

interface Props {
  projects: Project[]
  bug?: Bug
  defaultProjectKey?: string | null
  /** Trả về promise: form ở trạng thái đang gửi (nút khóa, không chặn điều hướng) đến khi promise kết thúc */
  onSubmit: (values: BugFormValues, otp: string) => Promise<unknown>
  onCancel: () => void
  /** Form nằm trong modal tạo mới: footer theo lề modal */
  inDialog?: boolean
  /** Báo form có thay đổi chưa lưu (modal hỏi trước khi đóng) */
  onDirtyChange?: (dirty: boolean) => void
}

export function BugForm({
  projects,
  bug,
  defaultProjectKey,
  onSubmit,
  onCancel,
  inDialog = false,
  onDirtyChange,
}: Props) {
  const { t } = useI18n()
  const currentUser = useMe().data?.name ?? ''
  const people = usePeople(currentUser, bug?.reporter, bug?.assignee)
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
          images: bug.images.map(({ id, type, url, caption, size }) => ({ id, type, url, caption, size })),
        }
      : {
          projectId: String(projects.find((p) => p.key === defaultProjectKey)?.id ?? ''),
          title: '',
          platform: [],
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
  // Người báo = người đang đăng nhập (me có thể về sau khi form đã mở)
  const { setValue, getValues } = form
  useEffect(() => {
    if (!isEdit && currentUser && !getValues('reporter')) setValue('reporter', currentUser)
  }, [isEdit, currentUser, getValues, setValue])
  // Form hợp lệ → hỏi OTP rồi mới gửi (doc API §12). `sending` giữ trạng thái đang gửi tới khi điều hướng xong.
  const [pending, setPending] = useState<BugFormValues | null>(null)
  const [sending, setSending] = useState(false)
  const submitting = sending
  const sendWithOtp = async (otp: string) => {
    setSending(true)
    try {
      await onSubmit(pending!, otp)
    } finally {
      setSending(false)
    }
  }
  // Có thay đổi chưa lưu → hỏi trước khi rời trang; khi đang gửi thì cho phép điều hướng sau khi lưu xong
  const leaveDialog = useUnsavedChangesGuard(formState.isDirty && !submitting)
  const isDirty = formState.isDirty
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange])
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
    <form onSubmit={form.handleSubmit((values) => setPending(values))} noValidate className="flex flex-col gap-5">
      {leaveDialog}
      <OtpDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} onSubmit={sendWithOtp} />
      {/* Thông tin chung */}
      <Section id="general" icon={FileText} title={t('form.general')}>
        <div className="flex flex-col gap-4">
          {/* Tiêu đề (8/12) + Dự án (4/12) cùng hàng; mobile xếp dọc */}
          <div className="grid gap-4 md:grid-cols-12">
            <Field
              id="bug-title"
              className="md:col-span-8"
              label={t('field.title')}
              icon={Type}
              error={errors.title?.message}
            >
              {(c) => <Input {...c} {...register('title')} placeholder={t('form.titlePlaceholder')} />}
            </Field>
            <Field
              id="bug-project"
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
            id="bug-platform"
            label={t('field.platform')}
            icon={MonitorSmartphone}
            error={errors.platform?.message}
          >
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PLATFORMS.map((p) => {
                  return (
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
                  )
                })}
              </div>
            )}
          </FieldSet>
        </div>
      </Section>

      {/* Phân loại */}
      <Section id="classify" icon={Tags} title={t('form.classify')} description={t('form.classifyDesc')}>
        <div className="flex flex-col gap-5">
          {project && (
            <div className="bg-muted flex gap-2.5 rounded-md p-3 text-sm">
              <Target className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{t('form.coreFeatures', { name: project.name })}</p>
                <p className="text-muted-foreground break-words">{project.description}</p>
              </div>
            </div>
          )}

          <FieldSet id="bug-core" label={t('field.isCore')} icon={Target} error={errors.isCore?.message}>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  registration={register('isCore')}
                  value="yes"
                  icon={Target}
                  tone="destructive"
                  title={t('core.yes')}
                  hint={t('core.yesHint')}
                  describedBy={describedBy}
                />
                <RadioCard
                  registration={register('isCore')}
                  value="no"
                  icon={CircleOff}
                  tone="neutral"
                  title={t('core.no')}
                  hint={t('core.noHint')}
                  describedBy={describedBy}
                />
              </div>
            )}
          </FieldSet>

          <FieldSet id="bug-severity" label={t('field.severity')} icon={Flame} error={errors.severity?.message}>
            {(describedBy) => (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {SEVERITIES.map((s) => {
                  const { icon, tone } = SEVERITY_META[s]
                  return (
                    <RadioCard
                      key={s}
                      registration={register('severity')}
                      value={s}
                      title={t(`severity.${s}`)}
                      hint={t(`severity.${s}Hint`)}
                      icon={icon}
                      tone={tone}
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
              handling === 'mustFix' && 'bg-destructive-bg text-destructive-text font-medium',
              handling === 'whenPossible' && 'bg-info-bg text-info-text font-medium',
              (handling === 'later' || !handling) && 'bg-muted text-muted-foreground',
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
      <Section id="repro" icon={ListOrdered} title={t('form.repro')} description={t('form.reproDesc')}>
        <div className="flex flex-col gap-4">
          <FieldSet id="bug-steps" label={t('field.steps')} icon={ListOrdered} error={stepsError}>
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
                >
                  <Plus aria-hidden />
                  {t('action.addStep')}
                </Button>
              </div>
            )}
          </FieldSet>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="bug-expected" label={t('field.expected')} icon={CircleCheck} error={errors.expected?.message}>
              {(c) => (
                <Textarea {...c} {...register('expected')} rows={3} placeholder={t('form.expectedPlaceholder')} />
              )}
            </Field>
            <Field id="bug-actual" label={t('field.actual')} icon={CircleX} error={errors.actual?.message}>
              {(c) => <Textarea {...c} {...register('actual')} rows={3} placeholder={t('form.actualPlaceholder')} />}
            </Field>
          </div>
        </div>
      </Section>

      {/* Ảnh minh chứng */}
      <Section
        id="images"
        icon={ImageIcon}
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
            <MediaField id="bug-images" value={field.value} onChange={field.onChange} describedBy="bug-images-hint" />
          )}
        />
      </Section>

      {/* Khác */}
      <Section id="other" icon={SlidersHorizontal} title={t('form.other')}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bug-reporter" label={t('field.reporter')} icon={User} error={errors.reporter?.message}>
              {(c) => (
                <Controller
                  control={control}
                  name="reporter"
                  render={({ field }) => (
                    <PersonSelect
                      {...c}
                      ref={field.ref}
                      value={field.value}
                      onValueChange={field.onChange}
                      people={people}
                      disabled // người báo = người đang đăng nhập, không gán cho người khác
                      className="disabled:bg-muted disabled:text-foreground disabled:opacity-100"
                    />
                  )}
                />
              )}
            </Field>
            <Field id="bug-assignee" label={t('field.assignee')} icon={Wrench}>
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
          <Field id="bug-note" label={t('field.note')} icon={StickyNote} error={errors.note?.message}>
            {(c) => <Textarea {...c} {...register('note')} rows={3} placeholder={t('form.notePlaceholder')} />}
          </Field>
        </div>
      </Section>

      <div
        className={cn(
          'bg-card/95 sticky bottom-0 z-10 flex justify-end gap-2 border-t py-3 backdrop-blur',
          // trong modal: bám đúng lề p-6 của DialogContent; trên trang: bám lề của layout
          inDialog ? '-mx-6 -mb-6 rounded-b-xl px-6' : '-mx-4 -mb-4 px-4 sm:-mx-6 sm:-mb-6 sm:px-6 xl:-mx-8 xl:px-8',
        )}
      >
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
