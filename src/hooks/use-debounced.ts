import { useEffect, useState } from 'react'

/** Giá trị trễ `ms` sau lần đổi cuối — để không gọi API mỗi phím gõ */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}
