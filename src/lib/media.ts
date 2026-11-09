const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi)$/i

/** Video: theo Content-Type, hoặc theo đuôi file khi trình duyệt không khai (một số .mkv/.mov) */
export const isVideoFile = (file: File) => file.type.startsWith('video/') || (!file.type && VIDEO_EXT.test(file.name))

/** SVG không nhận (chạy được script) — backend cũng từ chối */
export const isImageFile = (file: File) => file.type.startsWith('image/') && file.type !== 'image/svg+xml'

/** Đuôi tệp đính kèm (không phải ảnh/video) — khớp FeatureMediaStore::FILE_EXTENSIONS ở backend */
export const FILE_EXTENSIONS = ['pdf', 'txt', 'log', 'csv', 'json', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z']

export const isAttachmentFile = (file: File) => {
  const dot = file.name.lastIndexOf('.')
  return dot > 0 && FILE_EXTENSIONS.includes(file.name.slice(dot + 1).toLowerCase())
}

/** Thuộc tính `accept` của ô chọn file */
export const MEDIA_ACCEPT = ['image/*', 'video/*', '.mov', '.mkv', ...FILE_EXTENSIONS.map((e) => `.${e}`)].join(',')
