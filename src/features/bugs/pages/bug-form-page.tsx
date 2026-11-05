import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { Breadcrumb, type Crumb } from '@/components/common/breadcrumb'
import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'
import { ApiError } from '@/services/api'
import { useBug, useCreateBug, useProjects, useUpdateBug } from '@/services/queries'
import { toBugInput, type BugFormValues } from '../bug-form-schema'
import { BugForm } from '../components/bug-form'

/** Báo bug mới (/bugs/new?project=FF) và sửa bug (/bugs/:code/edit) dùng chung một form */
export function BugFormPage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!code

  const projects = useProjects()
  const bugQuery = useBug(code ?? '', isEdit)
  const create = useCreateBug()
  const update = useUpdateBug(code ?? '')

  const title = isEdit ? t('form.editTitle', { code: code ?? '' }) : t('form.newTitle')
  useDocumentTitle(title)

  const goBack = (fallback: string) => (location.key !== 'default' ? navigate(-1) : navigate(fallback))

  if (projects.isPending || (isEdit && bugQuery.isPending))
    return (
      <div className="flex w-full flex-col gap-4" aria-label={t('common.loading')}>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  if (isEdit && bugQuery.error instanceof ApiError && bugQuery.error.code === 'not_found')
    return <NotFoundPage title={t('error.bugNotFound', { code: code ?? '' })} />
  if (projects.isError || bugQuery.isError)
    return (
      <ErrorState
        onRetry={() => (projects.isError ? projects.refetch() : bugQuery.refetch())}
        className="py-24"
        titleAs="h1"
      />
    )

  const onSubmit = (values: BugFormValues) => {
    const input = toBugInput(values)
    const { projectId, ...rest } = input // dự án không đổi khi sửa
    const save = isEdit ? update.mutateAsync(rest) : create.mutateAsync(input)
    return save.then(
      (bug) => {
        toast.success(t(isEdit ? 'toast.bugUpdated' : 'toast.bugCreated', { code: bug.code }))
        navigate(`/bugs/${bug.code}`, { replace: true })
      },
      () => {}, // lỗi đã được toast tập trung (MutationCache); form giữ nguyên dữ liệu
    )
  }

  const project = projects.data.find((p) =>
    isEdit ? p.id === bugQuery.data?.projectId : p.key === params.get('project'),
  )
  const crumbs: Crumb[] = [{ label: project?.name ?? t('nav.allProjects'), to: project ? `/${project.key}` : '/all' }]
  if (isEdit) crumbs.push({ label: code ?? '', to: `/bugs/${code}`, mono: true }, { label: t('action.edit') })
  else crumbs.push({ label: t('form.newTitle') })

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Breadcrumb items={crumbs} />
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <BugForm
        projects={projects.data}
        bug={bugQuery.data}
        defaultProjectKey={params.get('project')}
        onSubmit={onSubmit}
        onCancel={() => goBack(isEdit ? `/bugs/${code}` : '/all')}
      />
    </div>
  )
}
