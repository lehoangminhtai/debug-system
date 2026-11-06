export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGES = 6

/**
 * Thu nhỏ ảnh về cạnh dài ≤ 1600px, mã hóa WebP → data URL.
 * ponytail: data URL trong localStorage (~5MB). Khi có backend: upload file gốc, chỉ lưu URL.
 */
export async function downscaleImage(file: File, maxSide = 1600, quality = 0.85): Promise<string> {
  return (await drawScaled(file, maxSide)).toDataURL('image/webp', quality)
}

/** Như downscaleImage nhưng trả Blob WebP — dùng cho upload multipart (tính năng mong muốn) */
export async function downscaleImageBlob(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const canvas = await drawScaled(file, maxSide)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/webp', quality),
  )
}

async function drawScaled(file: File, maxSide: number) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}
