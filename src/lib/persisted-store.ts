import { useSyncExternalStore } from 'react'

/** Giá trị toàn cục nhỏ, lưu vào localStorage. ponytail: thay cho Zustand khi chỉ có 2 giá trị. */
export function createPersistedStore<T extends string>(key: string, fallback: T, isValid: (v: string) => v is T) {
  let value = fallback
  try {
    const saved = localStorage.getItem(key)
    if (saved && isValid(saved)) value = saved
  } catch {
    // localStorage bị chặn (private mode) → dùng giá trị mặc định
  }
  const listeners = new Set<() => void>()

  const set = (next: T) => {
    value = next
    try {
      localStorage.setItem(key, next)
    } catch {
      // vẫn đổi trong phiên hiện tại
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  const get = () => value
  const use = () => useSyncExternalStore(subscribe, get)

  return { get, set, subscribe, use }
}
