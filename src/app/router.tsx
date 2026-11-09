import { Navigate, createHashRouter, useLocation, useParams } from 'react-router-dom'
import { BugDetailPage } from '@/features/bugs/pages/bug-detail-page'
import { ScopeLayout } from '@/features/bugs/pages/scope-layout'
import { ItemBoardPage } from '@/features/items/pages/item-board-page'
import { ItemListPage } from '@/features/items/pages/item-list-page'
import { AppLayout } from './layouts/app-layout'
import { LoginPage } from './login-page'
import { NotFoundPage } from './not-found-page'
import { RouteError } from './route-error'

// Form (zod + react-hook-form + xử lý ảnh/video) chỉ tải khi mở trang tạo/sửa
const bugForm = async () => ({ Component: (await import('@/features/bugs/pages/bug-form-page')).BugFormPage })
const featureDetail = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-detail-page')).FeatureDetailPage,
})
const featureForm = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-form-page')).FeatureFormPage,
})

/**
 * Tạo mới là modal trên trang danh sách: /new, /bugs/new, /features/new (link cũ, ?project=FF)
 * → /FF?create=bug|feature (ScopeLayout mở modal theo ?create=).
 */
function RedirectToNew({ type }: { type?: 'bug' | 'feature' }) {
  const params = new URLSearchParams(useLocation().search)
  const project = params.get('project')
  const kind = type ?? (params.get('type') === 'feature' ? 'feature' : 'bug')
  return <Navigate replace to={`/${project || 'all'}?create=${kind}`} />
}

/** Link cũ /FF/features(/board) → bảng gộp /FF(/board)?type=feature */
function RedirectFeatures({ board = false }: { board?: boolean }) {
  const { scope = 'all' } = useParams()
  const params = new URLSearchParams(useLocation().search)
  params.set('type', 'feature')
  return <Navigate replace to={`/${scope}${board ? '/board' : ''}?${params}`} />
}

// Hash URL (/#/FF/board): host tĩnh không cần cấu hình rewrite về index.html
export const router = createHashRouter([
  { path: 'login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/all" replace /> },
      { path: 'new', element: <RedirectToNew /> },
      { path: 'bugs', element: <Navigate to="/all" replace /> },
      { path: 'bugs/new', element: <RedirectToNew type="bug" /> },
      { path: 'bugs/:code', element: <BugDetailPage /> },
      { path: 'bugs/:code/edit', lazy: bugForm },
      { path: 'features/new', element: <RedirectToNew type="feature" /> },
      { path: 'features/:code', lazy: featureDetail },
      { path: 'features/:code/edit', lazy: featureForm },
      { path: ':scope/features', element: <RedirectFeatures /> },
      { path: ':scope/features/board', element: <RedirectFeatures board /> },
      {
        // :scope = "all" hoặc mã dự án (FF). Bug + Tính năng mong muốn chung một bảng, lọc theo cột "Loại".
        path: ':scope',
        element: <ScopeLayout />,
        children: [
          { index: true, element: <ItemListPage /> },
          { path: 'board', element: <ItemBoardPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
