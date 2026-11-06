import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/not-found-page'
import { Breadcrumb, type Crumb } from '@/components/common/breadcrumb'
import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'
import { ApiError } from '@/services/api'
import { useCreateFeature, useFeature, useProjects, useUpdateFeature } from '@/services/queries'
import { FeatureForm } from '../components/feature-form'
import { toFeatureInput, type FeatureFormValues } from '../feature-form-schema'

/** Đề xuất mới (/features/new?project=FF) và sửa (/features/:code/edit) dùng chung một form */
export function FeatureFormPage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!code

  const projects = useProjects()
  const featureQuery = useFeature(code ?? '', isEdit)
  const create = useCreateFeature()
  const update = useUpdateFeature(code ?? '')

  const title = isEdit ? t('form.editTitle', { code: code ?? '' }) : t('feature.new')
  useDocumentTitle(title)

  if (projects.isPending || (isEdit && featureQuery.isPending))
    return (
      <div className="flex w-full flex-col gap-4" aria-label={t('common.loading')}>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  if (isEdit && featureQuery.error instanceof ApiError && featureQuery.error.code === 'not_found')
    return <NotFoundPage title={t('error.featureNotFound', { code: code ?? '' })} />
  if (projects.isError || featureQuery.isError)
    return (
      <ErrorState
        onRetry={() => (projects.isError ? projects.refetch() : featureQuery.refetch())}
        className="py-24"
        titleAs="h1"
      />
    )

  const project = projects.data.find((p) =>
    isEdit ? p.id === featureQuery.data?.projectId : p.key === params.get('project'),
  )
  const listUrl = `/${project?.key ?? 'all'}/features`
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(isEdit ? `/features/${code}` : listUrl))

  // Lỗi do MutationCache toast chung; lỗi OTP hiện trong hộp thoại OTP
  const onSubmit = (values: FeatureFormValues, otp: string) => {
    const { projectId, ...rest } = toFeatureInput(values)
    const save = isEdit
      ? update.mutateAsync({ input: rest, otp })
      : create.mutateAsync({ input: { projectId, ...rest }, otp })
    return save.then((f) => {
      toast.success(t(isEdit ? 'toast.bugUpdated' : 'toast.featureCreated', { code: f.code }))
      navigate(`/features/${f.code}`, { replace: true })
    })
  }

  const crumbs: Crumb[] = [
    { label: project?.name ?? t('nav.allProjects'), to: `/${project?.key ?? 'all'}` },
    { label: t('nav.features'), to: listUrl },
  ]
  if (isEdit) crumbs.push({ label: code ?? '', to: `/features/${code}`, mono: true }, { label: t('action.edit') })
  else crumbs.push({ label: t('feature.new') })

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Breadcrumb items={crumbs} />
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <FeatureForm
        projects={projects.data}
        feature={featureQuery.data}
        defaultProjectKey={params.get('project')}
        onSubmit={onSubmit}
        onCancel={goBack}
      />
    </div>
  )
}
