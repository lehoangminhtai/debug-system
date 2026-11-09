/**
 * Thu nhỏ ảnh về cạnh dài ≤ 1600px, mã hóa WebP → Blob để upload multipart.
 * Chỉ để ảnh nhẹ hơn khi tải lên/xem — không còn giới hạn dung lượng hay số lượng ảnh.
 */
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
