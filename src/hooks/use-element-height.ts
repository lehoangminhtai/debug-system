import { useCallback, useState } from 'react'

/** Chiều cao (px, gồm viền) của phần tử, cập nhật khi nó đổi kích thước. Gắn `ref` trả về vào phần tử cần đo. */
export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number>()
  const ref = useCallback((el: T | null) => {
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0]?.blockSize ?? el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, height] as const
}
