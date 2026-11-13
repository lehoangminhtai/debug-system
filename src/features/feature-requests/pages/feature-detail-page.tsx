import {
  Activity,
  ArrowLeft,
  Calendar,
  CircleSlash,
  FolderKanban,
  Lightbulb,
  Loader2,
  Pencil,
  RotateCcw,
  User,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { FeatureStatusBadge, PlatformBadge, PriorityBadge } from '@/components/common/badges'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { CommentSection } from '@/components/common/comment-section'
import { InfoBar, InfoItem } from '@/components/common/info-bar'
import { OtpDeleteButton } from '@/components/common/otp-dialog'
import { PersonSelect } from '@/components/common/person-select'
import { ProgressTimeline } from '@/components/common/progress-timeline'
import { RichContentView } from '@/components/common/rich-text'
import { Section } from '@/components/common/section'
import { ErrorState } from '@/components/common/states'
import { UserName } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryButton } from '@/features/bugs/components/history-button'
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
import { RejectDialog } from '../components/reject-dialog'

const UNASSIGNED = '__none'

/** Các bước của luồng chuẩn; "Từ chối" nằm ngoài luồng (hiện thành nhãn riêng) */
const STEPS = FEATURE_STATUSES.filter((s) => s !== 'rejected')

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
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-80 rounded-lg xl:col-span-8" />
        <Skeleton className="h-80 rounded-lg xl:col-span-4" />
      </div>
    </div>
  )
}

/** Cùng bố cục với chi tiết bug: tiến trình gọn → Thông tin nằm ngang → Nội dung (8/12) | Bình luận (4/12). */
export function FeatureDetailPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const query = useFeature(code, true, true)
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
    // Bị xoá (kể cả lúc đang xem — tải định kỳ phát hiện) → không tìm thấy
    if (query.error instanceof ApiError && query.error.code === 'not_found')
      return <NotFoundPage title={t('error.featureNotFound', { code })} />
    // Lỗi khi tải lại định kỳ (mạng chập chờn) mà đã có dữ liệu → giữ trang, lần sau tự thử lại
    if (!feature) return <ErrorState onRetry={() => query.refetch()} className="py-24" titleAs="h1" />
  }

  const f = feature!
  const project = projects.data?.find((p) => p.id === f.projectId)
  const listUrl = `/${project?.key ?? 'all'}?type=feature`
  const goBack = () => ((location.state as typeof FROM_LIST | null)?.fromList ? navigate(-1) : navigate(listUrl))
  const busy = changeStatus.isPending || assign.isPending
  const current = STEPS.indexOf(f.status as (typeof STEPS)[number]) // -1 khi bị từ chối

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
    <article className="flex flex-col gap-4">
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

      {/* Tiến trình gọn một dòng + hành động. Màn hẹp: hành động xuống dòng dưới */}
      <section
        aria-labelledby="progress-title"
        className="bg-card flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:gap-6"
      >
        <h2 id="progress-title" className="sr-only">
          {t('detail.progress')}
        </h2>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {f.status === 'rejected' && <FeatureStatusBadge status="rejected" />}
          <ProgressTimeline
            label={t('detail.progress')}
            current={current}
            steps={STEPS.map((s, i) => {
              const entry = i <= current ? f.history.findLast((h) => h.status === s) : undefined
              return { key: s, label: t(`featureStatus.${s}`), entry }
            })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
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
          <HistoryButton history={f.history} kind="feature" />
        </div>
      </section>

      {/* Thông tin nằm ngang */}
      <InfoBar title={t('detail.info')}>
        <InfoItem
          icon={Activity}
          htmlFor="feature-status"
          label={
            <>
              {t('field.status')}
              {busy && <Loader2 className="size-3 animate-spin" aria-label={t('common.saving')} />}
            </>
          }
        >
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
        </InfoItem>
        {/* Vừa đủ tên + mã nhân viên (không chia đều như các ô khác) */}
        <InfoItem icon={Wrench} htmlFor="feature-assignee" label={t('field.owner')} className="flex-none">
          <PersonSelect
            id="feature-assignee"
            className="w-auto max-w-full min-w-36"
            value={f.assignee ?? UNASSIGNED}
            onValueChange={setAssignee}
            disabled={busy}
            people={people}
            none={{ value: UNASSIGNED, label: t('table.unassigned') }}
          />
        </InfoItem>
        <InfoItem icon={FolderKanban} label={t('field.project')}>
          <span className="truncate font-medium">{project?.name ?? t('common.none')}</span>
        </InfoItem>
        <InfoItem icon={User} label={t('field.requester')}>
          <UserName name={f.requester} fallback={t('common.none')} />
        </InfoItem>
        <InfoItem icon={Calendar} label={t('field.createdAt')}>
          <time dateTime={f.createdAt} className="tabular-nums">
            {formatTs(f.createdAt)}
          </time>
        </InfoItem>
      </InfoBar>

      {/* Nội dung (8/12) | Bình luận (4/12, dính khi cuộn). Dưới xl: xếp dọc */}
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <Section id="content" icon={Lightbulb} title={t('feature.content')}>
            <RichContentView html={f.content} empty={t('detail.noContent')} />
          </Section>
        </div>
        <div className="min-w-0 xl:sticky xl:top-18 xl:col-span-4">
          {/* key theo mã → sang đề xuất khác thì tính lại "đã xem" */}
          <CommentSection key={f.code} kind="feature" code={f.code} comments={f.comments ?? []} />
        </div>
      </div>
    </article>
  )
}
