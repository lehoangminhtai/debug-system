import { lazy, Suspense, type ComponentProps } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Tiptap (~300 kB) chỉ tải khi mở form hoặc trang chi tiết, không nằm trong bundle chính
const Editor = lazy(() => import('./rich-editor').then((m) => ({ default: m.RichEditor })))
const View = lazy(() => import('./rich-content-view').then((m) => ({ default: m.RichContentView })))

export const RichEditor = (props: ComponentProps<typeof Editor>) => (
  <Suspense fallback={<Skeleton className="h-60 rounded-md" />}>
    <Editor {...props} />
  </Suspense>
)

export const RichContentView = (props: ComponentProps<typeof View>) => (
  <Suspense fallback={<Skeleton className="h-24 rounded-md" />}>
    <View {...props} />
  </Suspense>
)
