import type { TKey } from './vi'

export type { TKey }
/** Mọi ngôn ngữ phải có đủ key; key `_one` là dạng số ít tùy chọn (dùng khi n === 1) */
export type Dict = Record<TKey, string> & Partial<Record<`${TKey}_one`, string>>
