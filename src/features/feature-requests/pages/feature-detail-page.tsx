import {
  Clock,
  Activity,
  ArrowLeft,
  Calendar,
  Clapperboard,
  CircleSlash,
  FolderKanban,
  History,
  Info,
  Lightbulb,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { FeatureStatusBadge, PlatformBadge, PriorityBadge } from '@/components/common/badges'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { OtpDeleteButton } from '@/components/common/otp-dialog'
import { PersonSelect } from '@/components/common/person-select'
import { Section } from '@/components/common/section'
import { ErrorState } from '@/components/common/states'
import { UserName } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryList } from '@/features/bugs/components/history-list'
import { FROM_LIST } from '@/features/bugs/hooks/use-scope'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n, type TKey } from '@/i18n'
import { formatTs } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  useAssignFeature,
  useChangeFeatureStatus,
  useDeleteFeature,
  useFeature,
  usePeople,
  useProjects,
} from '@/services/queries'
import { FEATURE_STATUSES, type FeatureStatus } from '@/types'
import { MediaGallery } from '@/components/common/media-gallery'
import { RejectDialog } from '../components/reject-dialog'

const UNASSIGNED = '__none'

/** Nút chuyển trạng thái gợi ý theo luồng Mới → Đã duyệt → Đang làm → Hoàn thành (spec §4). Select vẫn cho mọi hướng. */
const NEXT: Record<FeatureStatus, { to: FeatureStatus; label: TKey; secondary?: boolean }[]> = {
  new: [
    { to: 'rejected', label: 'feature.reject', secondary: true },
    { to: 'accepted', label: 'feature.accept' },
  ],
  accepted: [
    { to: 'rejected', label: 'feature.reject', secondary: true },
    { to: 'in_progress', label: 'feature.start' },
  ],
  in_progress: [{ to: 'done', label: 'feature.markDone' }],
  done: [{ to: 'in_progress', label: 'detail.reopen', secondary: true }],
  rejected: [{ to: 'new', label: 'detail.reopen', secondary: true }],
}

function IconLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  )
}

/** Ô bỏ trống khi đề xuất (không còn bắt buộc) → hiện "—" */
const TextBlock = ({ text }: { text: string }) =>
  text.trim() ? (
    <p className="text-sm break-words whitespace-pre-wrap">{text}</p>
  ) : (
    <p className="text-muted-foreground text-sm">—</p>
  )

function DetailSkeleton() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4" aria-label={t('common.loading')}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}

export function FeatureDetailPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const query = useFeature(code)
  const projects = useProjects()
  const changeStatus = useChangeFeatureStatus()
  const assign = useAssignFeature()
  const del = useDeleteFeature()
  const [rejectOpen, setRejectOpen] = useState(false)
  const feature = query.data
  const people = usePeople(feature?.assignee)
  useDocumentTitle(feature ? `${feature.code} ${feature.title}` : undefined)

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'not_found')
      return <NotFoundPage title={t('error.featureNotFound', { code })} />
    return <ErrorState onRetry={() => query.refetch()} className="py-24" titleAs="h1" />
  }

  const f = feature!
  const project = projects.data?.find((p) => p.id === f.projectId)
  const listUrl = `/${project?.key ?? 'all'}?type=feature`
  const goBack = () => ((location.state as typeof FROM_LIST | null)?.fromList ? navigate(-1) : navigate(listUrl))
  const busy = changeStatus.isPending || assign.isPending

  const setStatus = (status: FeatureStatus, rejectReason?: string) => {
    if (status === 'rejected' && rejectReason === undefined) return setRejectOpen(true)
    changeStatus.mutate(
      { code: f.code, status, rejectReason },
      {
        onSuccess: () => {
          setRejectOpen(false)
          toast.success(t('toast.statusChanged', { code: f.code, status: t(`featureStatus.${status}`) }))
        },
      },
    )
  }
  const setAssignee = (value: string) => {
    const assignee = value === UNASSIGNED ? null : value
    assign.mutate(
      { code: f.code, assignee },
      {
        onSuccess: () =>
          toast.success(
            assignee
              ? t('toast.assigned', { code: f.code, name: assignee })
              : t('toast.ownerRemoved', { code: f.code }),
          ),
      },
    )
  }

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={goBack}>
            <ArrowLeft aria-hidden />
            {t('action.back')}
          </Button>
          <Breadcrumb
            items={[
              { label: project?.name ?? t('nav.allProjects'), to: `/${project?.key ?? 'all'}` },
              { label: t('nav.features'), to: listUrl },
              { label: f.code, mono: true },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="min-w-0 text-xl font-semibold break-words">{f.title || t('common.untitled')}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end sm:pt-1">
            <FeatureStatusBadge status={f.status} />
            <PriorityBadge priority={f.priority} />
            <PlatformBadge platform={f.platform} />
          </div>
        </div>
        {/* Hành động: chuyển trạng thái theo luồng + Sửa / Xoá */}
        <div className="flex flex-wrap gap-2">
          {NEXT[f.status].map((a) => (
            <Button
              key={a.to}
              size="sm"
              variant={a.secondary ? 'outline' : 'default'}
              disabled={busy}
              onClick={() => setStatus(a.to)}
            >
              {a.to === 'rejected' ? <CircleSlash aria-hidden /> : a.secondary && <RotateCcw aria-hidden />}
              {t(a.label)}
            </Button>
          ))}
          <span aria-hidden className="bg-border mx-1 hidden w-px sm:block" />
          <Button asChild variant="outline" size="sm">
            <Link to={`/features/${f.code}/edit`}>
              <Pencil aria-hidden />
              {t('action.edit')}
            </Link>
          </Button>
          <OtpDeleteButton
            title={t('feature.deleteTitle', { code: f.code })}
            description={t('feature.deleteDesc', { code: f.code })}
            confirmLabel={t('action.deleteFeature')}
            confirmCode={f.code}
            onConfirm={(otp, confirm) =>
              del.mutateAsync({ code: f.code, confirm, otp }).then(() => {
                toast.success(t('toast.bugDeleted', { code: f.code }))
                navigate(listUrl, { replace: true })
              })
            }
          />
        </div>
        {f.status === 'rejected' && f.rejectReason && (
          <div role="note" className="border-destructive/30 bg-destructive-bg rounded-md border p-3">
            <h2 className="text-destructive-text mb-1 flex items-center gap-1.5 text-xs font-semibold">
              <CircleSlash className="size-3.5" aria-hidden />
              {t('field.rejectReason')}
            </h2>
            <TextBlock text={f.rejectReason} />
          </div>
        )}
      </header>

      {rejectOpen && (
        <RejectDialog
          feature={f}
          open
          onOpenChange={setRejectOpen}
          busy={changeStatus.isPending}
          onConfirm={(reason) => setStatus('rejected', reason)}
        />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Section id="content" icon={Lightbulb} title={t('feature.content')}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-muted rounded-md border p-3">
                <h3 className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-semibold">
                  <Clock className="size-3.5" aria-hidden />
                  {t('field.current')}
                </h3>
                <TextBlock text={f.current} />
              </div>
              <div className="border-primary/30 bg-primary-light/50 rounded-md border p-3">
                <h3 className="text-primary-hover mb-1 flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="size-3.5" aria-hidden />
                  {t('field.desired')}
                </h3>
                <TextBlock text={f.desired} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-success-text mb-1 flex items-center gap-1.5 text-xs font-semibold">
                <TrendingUp className="size-3.5" aria-hidden />
                {t('field.benefit')}
              </h3>
              {f.benefit ? (
                <TextBlock text={f.benefit} />
              ) : (
                <p className="text-muted-foreground text-sm">{t('feature.noBenefit')}</p>
              )}
            </div>
          </Section>

          <Section id="media" icon={Clapperboard} title={t('field.media')}>
            {f.media.length ? (
              <MediaGallery media={f.media} />
            ) : (
              <p className="text-muted-foreground text-sm">{t('feature.noMedia')}</p>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-5 lg:self-stretch">
          <Section id="info" icon={Info} title={t('detail.info')}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feature-status">
                  <IconLabel icon={Activity}>{t('field.status')}</IconLabel>
                </Label>
                <Select value={f.status} onValueChange={(v) => setStatus(v as FeatureStatus)} disabled={busy}>
                  <SelectTrigger id="feature-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <FeatureStatusBadge status={s} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feature-assignee">
                  <IconLabel icon={Wrench}>{t('field.owner')}</IconLabel>
                </Label>
                <PersonSelect
                  id="feature-assignee"
                  value={f.assignee ?? UNASSIGNED}
                  onValueChange={setAssignee}
                  disabled={busy}
                  people={people}
                  none={{ value: UNASSIGNED, label: t('table.unassigned') }}
                />
              </div>
              {busy && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  {t('common.saving')}
                </p>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 border-t pt-4 text-sm">
              <dt className="text-muted-foreground">
                <IconLabel icon={FolderKanban}>{t('field.project')}</IconLabel>
              </dt>
              <dd className="min-w-0 truncate font-medium">{project?.name ?? t('common.none')}</dd>
              <dt className="text-muted-foreground">
                <IconLabel icon={User}>{t('field.requester')}</IconLabel>
              </dt>
              <dd>
                <UserName name={f.requester} fallback={t('common.none')} />
              </dd>
              <dt className="text-muted-foreground">
                <IconLabel icon={Calendar}>{t('field.createdAt')}</IconLabel>
              </dt>
              <dd>
                <time dateTime={f.createdAt} className="tabular-nums">
                  {formatTs(f.createdAt)}
                </time>
              </dd>
            </dl>
          </Section>

          <Section
            id="history"
            icon={History}
            title={t('detail.history')}
            className="lg:flex lg:min-h-80 lg:flex-1 lg:flex-col"
            bodyClassName="lg:relative lg:flex-1"
          >
            <HistoryList history={f.history} kind="feature" className="lg:absolute lg:inset-4 lg:max-h-none" />
          </Section>
        </aside>
      </div>
    </article>
  )
}
