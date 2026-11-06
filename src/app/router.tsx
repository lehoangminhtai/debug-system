import { Navigate, createHashRouter } from 'react-router-dom'
import { BoardPage } from '@/features/bugs/pages/board-page'
import { BugDetailPage } from '@/features/bugs/pages/bug-detail-page'
import { BugListPage } from '@/features/bugs/pages/bug-list-page'
import { ScopeLayout } from '@/features/bugs/pages/scope-layout'
import { AppLayout } from './layouts/app-layout'
import { LoginPage } from './login-page'
import { NotFoundPage } from './not-found-page'
import { RouteError } from './route-error'

// Form (zod + react-hook-form + xử lý ảnh) chỉ tải khi mở trang báo/sửa bug
const formPage = async () => ({ Component: (await import('@/features/bugs/pages/bug-form-page')).BugFormPage })

// Tính năng mong muốn: tải riêng khi mở (không làm nặng bundle chính của phần bug)
const featureList = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-list-page')).FeatureListPage,
})
const featureBoard = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-board-page')).FeatureBoardPage,
})
const featureDetail = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-detail-page')).FeatureDetailPage,
})
const featureForm = async () => ({
  Component: (await import('@/features/feature-requests/pages/feature-form-page')).FeatureFormPage,
})

// Hash URL (/#/FF/board): host tĩnh không cần cấu hình rewrite về index.html
export const router = createHashRouter([
  { path: 'login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/all" replace /> },
      { path: 'bugs', element: <Navigate to="/all" replace /> },
      { path: 'bugs/new', lazy: formPage },
      { path: 'bugs/:code', element: <BugDetailPage /> },
      { path: 'bugs/:code/edit', lazy: formPage },
      { path: 'features/new', lazy: featureForm },
      { path: 'features/:code', lazy: featureDetail },
      { path: 'features/:code/edit', lazy: featureForm },
      {
        // cùng khung với bug: tab Danh sách / Kanban
        path: ':scope/features',
        element: <ScopeLayout kind="features" />,
        children: [
          { index: true, lazy: featureList },
          { path: 'board', lazy: featureBoard },
        ],
      },
      {
        // :scope = "all" hoặc mã dự án (FF)
        path: ':scope',
        element: <ScopeLayout />,
        children: [
          { index: true, element: <BugListPage /> },
          { path: 'board', element: <BoardPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
