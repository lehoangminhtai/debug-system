import { ImageGallery } from '@/features/bugs/components/image-gallery'
import { useI18n } from '@/i18n'
import type { FeatureMedia } from '@/types'

/** Ảnh: lưới thu nhỏ, bấm xem lớn (dùng lại của bug). Video: trình phát có sẵn của trình duyệt. */
export function MediaGallery({ media }: { media: FeatureMedia[] }) {
  const { t } = useI18n()
  const images = media.filter((m) => m.type === 'image')
  const videos = media.filter((m) => m.type === 'video')
  return (
    <div className="flex flex-col gap-4">
      {videos.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {videos.map((v, i) => (
            <li key={v.id}>
              <figure className="flex flex-col gap-1.5">
                <video
                  src={v.url}
                  controls
                  preload="metadata"
                  aria-label={v.caption || t('feature.videoN', { n: i + 1 })}
                  className="bg-muted aspect-video w-full rounded-md border object-contain"
                />
                {v.caption && (
                  <figcaption className="text-muted-foreground text-xs break-words">{v.caption}</figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      )}
      {images.length > 0 && <ImageGallery images={images} />}
    </div>
  )
}
