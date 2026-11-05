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
