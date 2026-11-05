import { useEffect } from 'react'

/** Tiêu đề tab theo trang — giúp screen reader và lịch sử trình duyệt phân biệt màn hình */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · DTS`
  }, [title])
}
