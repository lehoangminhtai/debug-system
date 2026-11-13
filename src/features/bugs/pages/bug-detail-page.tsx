import { formatTs } from '@/lib/utils'
import {
  Activity,
  ArrowLeft,
  Calendar,
  FolderKanban,
  ListOrdered,
  Loader2,
  MonitorSmartphone,
  Pencil,
  RotateCcw,
  Target,
  User,
  Wrench,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { CoreBadge, MustFixBadge, Pill, PlatformBadge, SeverityBadge, StatusBadge } from '@/components/common/badges'
import { CommentSection } from '@/components/common/comment-section'
import { InfoBar, InfoItem } from '@/components/common/info-bar'
import { PersonSelect } from '@/components/common/person-select'
import { OtpDeleteButton } from '@/components/common/otp-dialog'
import { ProgressTimeline } from '@/components/common/progress-timeline'
import { RichContentView } from '@/components/common/rich-text'
import { Section } from '@/components/common/section'
import { ErrorState } from '@/components/common/states'
import { UserName } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n, type TKey } from '@/i18n'
import { statusRank } from '@/lib/rules'
import { ApiError } from '@/services/api'
import { useAssign, useBug, useChangeStatus, useDeleteBug, usePeople, useProjects } from '@/services/queries'
import { STATUSES, type Bug, type Status } from '@/types'
import { HistoryButton } from '../components/history-button'
import { FROM_LIST } from '../hooks/use-scope'

const UNASSIGNED = '__none'

/** Hành động kế tiếp theo luồng chuẩn (spec §4) */
const NEXT: Record<Status, { to: Status; label: TKey; secondary?: boolean }[]> = {
  new: [{ to: 'fixing', label: 'detail.claim' }],
  fixing: [{ to: 'fixed', label: 'detail.markFixed' }],
  fixed: [
    { to: 'fixing', label: 'detail.reopen', secondary: true },
    { to: 'closed', label: 'detail.close' },
  ],
  closed: [{ to: 'fixing', label: 'detail.reopen', secondary: true }],
}

function DeleteBugButton({ bug, projectKey }: { bug: Bug; projectKey?: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const del = useDeleteBug()
  return (
    <OtpDeleteButton
      title={t('detail.deleteTitle', { code: bug.code })}
      description={t('detail.deleteDesc', { code: bug.code })}
      confirmLabel={t('action.deleteBug')}
      confirmCode={bug.code}
      onConfirm={(otp, confirm) =>
        del.mutateAsync({ code: bug.code, confirm, otp }).then(() => {
          toast.success(t('toast.bugDeleted', { code: bug.code }))
          navigate(projectKey ? `/${projectKey}` : '/all', { replace: true })
        })
      }
    />
  )
}

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

/**
 * Bố cục: tiêu đề → thanh tiến trình gọn (nút chuyển trạng thái, Sửa, Xoá, 🕘 Lịch sử) → dải Thông tin nằm ngang →
 * Mô tả (8/12) | Bình luận (4/12, dính khi cuộn). Dưới xl (cột 4/12 quá hẹp vì có sidebar): xếp dọc.
 */
export function BugDetailPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const bugQuery = useBug(code, true, true)
  const projects = useProjects()
  const changeStatus = useChangeStatus()
  const assign = useAssign()
  const bug = bugQuery.data
  const people = usePeople(bug?.assignee)
  useDocumentTitle(bug ? `${bug.code} ${bug.title}` : undefined)

  if (bugQuery.isPending) return <DetailSkeleton />
  if (bugQuery.isError) {
    // Bị xoá (kể cả lúc đang xem — tải định kỳ phát hiện) → không tìm thấy
    if (bugQuery.error instanceof ApiError && bugQuery.error.code === 'not_found')
      return <NotFoundPage title={t('error.bugNotFound', { code })} />
    // Lỗi khi tải lại định kỳ (mạng chập chờn) mà đã có dữ liệu → giữ trang, lần sau tự thử lại
    if (!bug) return <ErrorState onRetry={() => bugQuery.refetch()} className="py-24" titleAs="h1" />
  }
  if (!bug) return null

  const project = projects.data?.find((p) => p.id === bug.projectId)
  const listUrl = project ? `/${project.key}` : '/all'
  // Vào từ Danh sách/Kanban → lùi lịch sử (giữ bộ lọc, vị trí cuộn); mở thẳng link / sau khi lưu form → danh sách dự án
  const goBack = () => ((location.state as typeof FROM_LIST | null)?.fromList ? navigate(-1) : navigate(listUrl))
  const busy = changeStatus.isPending || assign.isPending
  const mustFix = bug.mustFix
  const current = statusRank(bug.status)

  const setStatus = (status: Status) =>
    changeStatus.mutate(
      { code: bug.code, status },
      { onSuccess: () => toast.success(t('toast.statusChanged', { code: bug.code, status: t(`status.${status}`) })) },
    )
  const setAssignee = (value: string) => {
    const assignee = value === UNASSIGNED ? null : value
    assign.mutate(
      { code: bug.code, assignee },
      {
        onSuccess: () =>
          toast.success(
            assignee
              ? t('toast.assigned', { code: bug.code, name: assignee })
              : t('toast.unassigned', { code: bug.code }),
          ),
      },
    )
  }

  return (
    <article className="flex flex-col gap-4">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={goBack}>
            <ArrowLeft aria-hidden />
            {t('action.back')}
          </Button>
          <Breadcrumb
            items={[
              { label: project?.name ?? t('nav.allProjects'), to: listUrl },
              { label: bug.code, mono: true },
            ]}
          />
        </div>
        {/* Tên bug bên trái, các trạng thái bên phải */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="min-w-0 text-xl font-semibold break-words">{bug.title || t('common.untitled')}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[50%] sm:shrink-0 sm:justify-end sm:pt-1">
            <StatusBadge status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            <PlatformBadge platform={bug.platform} />
            {bug.isCore && <CoreBadge />}
            {mustFix && <MustFixBadge />}
          </div>
        </div>
      </header>

      {/* Tiến trình gọn một dòng + hành động. Màn hẹp: hành động xuống dòng dưới */}
      <section
        aria-labelledby="progress-title"
        className="bg-card flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:gap-6"
      >
        <h2 id="progress-title" className="sr-only">
          {t('detail.progress')}
        </h2>
        <ProgressTimeline
          label={t('detail.progress')}
          current={current}
          steps={STATUSES.map((s, i) => {
            const entry = i <= current ? bug.history.findLast((h) => h.status === s) : undefined
            return { key: s, label: t(`status.${s}`), entry }
          })}
        />
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
          {NEXT[bug.status].map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.secondary ? 'outline' : 'default'}
              disabled={busy}
              aria-busy={busy}
              onClick={() => setStatus(a.to)}
            >
              {a.secondary && <RotateCcw aria-hidden />}
              {t(a.label)}
            </Button>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link to={`/bugs/${bug.code}/edit`}>
              <Pencil aria-hidden />
              {t('action.edit')}
            </Link>
          </Button>
          <DeleteBugButton bug={bug} projectKey={project?.key} />
          <HistoryButton history={bug.history} />
        </div>
      </section>

      {/* Thông tin nằm ngang */}
      <InfoBar title={t('detail.info')}>
        <InfoItem
          icon={Activity}
          htmlFor="detail-status"
          label={
            <>
              {t('field.status')}
              {busy && <Loader2 className="size-3 animate-spin" aria-label={t('common.saving')} />}
            </>
          }
        >
          <Select value={bug.status} onValueChange={(v) => setStatus(v as Status)} disabled={busy}>
            <SelectTrigger id="detail-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusBadge status={s} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InfoItem>
        {/* Vừa đủ tên + mã nhân viên (không chia đều như các ô khác) */}
        <InfoItem icon={Wrench} htmlFor="detail-assignee" label={t('field.assignee')} className="flex-none">
          <PersonSelect
            id="detail-assignee"
            className="w-auto max-w-full min-w-36"
            value={bug.assignee ?? UNASSIGNED}
            onValueChange={setAssignee}
            disabled={busy}
            people={people}
            none={{ value: UNASSIGNED, label: t('table.unassigned') }}
          />
        </InfoItem>
        <InfoItem icon={FolderKanban} label={t('field.project')}>
          <span className="truncate font-medium">{project?.name ?? t('common.none')}</span>
        </InfoItem>
        <InfoItem icon={User} label={t('field.reporter')}>
          <UserName name={bug.reporter} fallback={t('common.none')} />
        </InfoItem>
        <InfoItem icon={Calendar} label={t('field.createdAt')}>
          <time dateTime={bug.createdAt} className="tabular-nums">
            {formatTs(bug.createdAt)}
          </time>
        </InfoItem>
        <InfoItem icon={MonitorSmartphone} label={t('field.platform')}>
          <span className="flex min-w-0 flex-wrap gap-1.5">
            <PlatformBadge platform={bug.platform} />
          </span>
        </InfoItem>
        <InfoItem icon={Target} label={t('field.core')}>
          <Pill tone={bug.isCore ? 'primary' : 'neutral'} icon={Target}>
            {t(bug.isCore ? 'core.yes' : 'core.no')}
          </Pill>
        </InfoItem>
      </InfoBar>

      {/* Mô tả (8/12) | Bình luận (4/12, dính khi cuộn để luôn thấy trao đổi). Dưới xl: xếp dọc */}
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <Section id="content" icon={ListOrdered} title={t('field.content')}>
            <RichContentView html={bug.content} empty={t('detail.noContent')} />
          </Section>
        </div>
        <div className="min-w-0 xl:sticky xl:top-18 xl:col-span-4">
          {/* key theo mã → sang bug khác thì tính lại "đã xem" */}
          <CommentSection key={bug.code} kind="bug" code={bug.code} comments={bug.comments ?? []} />
        </div>
      </div>
    </article>
  )
}
