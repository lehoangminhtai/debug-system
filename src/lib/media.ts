/** File minh chứng trong form (bug và đề xuất tính năng dùng chung) */
export interface MediaValue {
  /** Có `id` = file đã lưu trên server; không có = file mới */
  id?: number
  file?: Blob
  name?: string
  type: 'image' | 'video'
  /** URL server hoặc object URL để xem trước */
  url: string
  caption: string
  size: number
}

/** Ảnh/video đã lưu trên server (Bug.images, Feature.media) */
export interface StoredMedia {
  id: number
  type: 'image' | 'video'
  url: string
  caption: string
  size?: number
}

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi)$/i

/** Video: theo Content-Type, hoặc theo đuôi file khi trình duyệt không khai (một số .mkv/.mov) */
export const isVideoFile = (file: File) => file.type.startsWith('video/') || (!file.type && VIDEO_EXT.test(file.name))

export const isImageFile = (file: File) => file.type.startsWith('image/')

/** Thuộc tính `accept` của ô chọn file */
export const MEDIA_ACCEPT = 'image/*,video/*,.mov,.mkv'
