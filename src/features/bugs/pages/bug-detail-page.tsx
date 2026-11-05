import { ArrowLeft, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { CoreBadge, MustFixBadge, PlatformBadge, SeverityBadge, StatusBadge } from '@/components/common/badges'
import { Section } from '@/components/common/section'
import { ErrorState } from '@/components/common/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n, type TKey } from '@/i18n'
import { isMustFix } from '@/lib/rules'
import { ApiError } from '@/services/api'
import { MEMBERS } from '@/services/current-user'
import { useAssign, useBug, useChangeStatus, useDeleteBug, useProjects } from '@/services/queries'
import { STATUSES, type Bug, type Status } from '@/types'
import { HistoryList } from '../components/history-list'
import { ImageGallery } from '../components/image-gallery'
import { StatusStepper } from '../components/status-stepper'
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

function TextBlock({ text }: { text: string }) {
  return <p className="text-sm break-words whitespace-pre-wrap">{text}</p>
}

function DeleteBugButton({ bug, projectKey }: { bug: Bug; projectKey?: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const del = useDeleteBug()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive-text hover:text-destructive-text">
          <Trash2 aria-hidden />
          {t('action.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('detail.deleteTitle', { code: bug.code })}</AlertDialogTitle>
          <AlertDialogDescription>{t('detail.deleteDesc', { code: bug.code })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              del.mutate(bug.code, {
                onSuccess: () => {
                  toast.success(t('toast.bugDeleted', { code: bug.code }))
                  navigate(projectKey ? `/${projectKey}` : '/all', { replace: true })
                },
              })
            }
          >
            {t('action.deleteBug')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DetailSkeleton() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4" aria-label={t('common.loading')}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}

export function BugDetailPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, formatDateTime } = useI18n()
  const bugQuery = useBug(code)
  const projects = useProjects()
  const changeStatus = useChangeStatus()
  const assign = useAssign()
  const bug = bugQuery.data
  useDocumentTitle(bug ? `${bug.code} ${bug.title}` : undefined)

  if (bugQuery.isPending) return <DetailSkeleton />
  if (bugQuery.isError) {
    if (bugQuery.error instanceof ApiError && bugQuery.error.code === 'not_found')
      return <NotFoundPage title={t('error.bugNotFound', { code })} />
    return <ErrorState onRetry={() => bugQuery.refetch()} className="py-24" titleAs="h1" />
  }
  if (!bug) return null

  const project = projects.data?.find((p) => p.id === bug.projectId)
  const listUrl = project ? `/${project.key}` : '/all'
  // Vào từ Danh sách/Kanban → lùi lịch sử (giữ bộ lọc, vị trí cuộn); mở thẳng link / sau khi lưu form → danh sách dự án
  const goBack = () => ((location.state as typeof FROM_LIST | null)?.fromList ? navigate(-1) : navigate(listUrl))
  const busy = changeStatus.isPending || assign.isPending
  const mustFix = isMustFix(bug)

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

  const steps = bug.steps.split('\n').filter((s) => s.trim())
  const handling = mustFix
    ? t('handling.mustFix')
    : bug.severity === 'low'
      ? t('handling.later')
      : t('handling.whenPossible')

  return (
    <article className="flex flex-col gap-5">
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
          <h1 className="min-w-0 text-xl font-semibold break-words">{bug.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[50%] sm:shrink-0 sm:justify-end sm:pt-1">
            <StatusBadge status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            <PlatformBadge platform={bug.platform} />
            {bug.isCore && <CoreBadge />}
            {mustFix && <MustFixBadge />}
          </div>
        </div>
      </header>

      {/* Tiến trình — Sửa / Xóa nằm cùng hàng với các nút chuyển trạng thái */}
      <Section
        id="progress"
        title={t('detail.progress')}
        action={
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
          </div>
        }
      >
        <StatusStepper bug={bug} />
      </Section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Nội dung tái tạo */}
        <div className="flex flex-col gap-5">
          <Section id="steps" title={t('field.steps')}>
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    aria-hidden
                    className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 break-words">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="border-success/30 bg-success-bg rounded-md border p-3">
                <h3 className="text-success-text mb-1 text-xs font-semibold">{t('field.expected')}</h3>
                <TextBlock text={bug.expected} />
              </div>
              <div className="border-destructive/30 bg-destructive-bg rounded-md border p-3">
                <h3 className="text-destructive-text mb-1 text-xs font-semibold">{t('field.actual')}</h3>
                <TextBlock text={bug.actual} />
              </div>
            </div>
          </Section>

          <Section id="images" title={t('field.images')}>
            {bug.images.length ? (
              <ImageGallery images={bug.images} />
            ) : (
              <p className="text-muted-foreground text-sm">{t('detail.noImages')}</p>
            )}
          </Section>

          <Section id="note" title={t('field.note')}>
            {bug.note ? (
              <TextBlock text={bug.note} />
            ) : (
              <p className="text-muted-foreground text-sm">{t('detail.noNote')}</p>
            )}
          </Section>
        </div>

        {/* Cột phụ */}
        <aside className="flex flex-col gap-5">
          <Section id="info" title={t('detail.info')}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail-status">{t('field.status')}</Label>
                <Select value={bug.status} onValueChange={(v) => setStatus(v as Status)} disabled={busy}>
                  <SelectTrigger id="detail-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail-assignee">{t('field.assignee')}</Label>
                <Select value={bug.assignee ?? UNASSIGNED} onValueChange={setAssignee} disabled={busy}>
                  <SelectTrigger id="detail-assignee" className="w-full">
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
              </div>
              {busy && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  {t('common.saving')}
                </p>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t pt-4 text-sm">
              <dt className="text-muted-foreground">{t('field.project')}</dt>
              <dd className="min-w-0 truncate">{project?.name ?? t('common.none')}</dd>
              <dt className="text-muted-foreground">{t('field.reporter')}</dt>
              <dd>{bug.reporter}</dd>
              <dt className="text-muted-foreground">{t('field.createdAt')}</dt>
              <dd>
                <time dateTime={bug.createdAt}>{formatDateTime(bug.createdAt)}</time>
              </dd>
              <dt className="text-muted-foreground">{t('field.core')}</dt>
              <dd>{t(bug.isCore ? 'core.yes' : 'core.no')}</dd>
              <dt className="text-muted-foreground">{t('field.handling')}</dt>
              <dd className={mustFix ? 'text-destructive-text font-medium' : undefined}>{handling}</dd>
            </dl>
          </Section>

          <Section id="history" title={t('detail.history')}>
            <HistoryList history={bug.history} />
          </Section>
        </aside>
      </div>
    </article>
  )
}
