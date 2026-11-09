import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/i18n'
import type { StoredMedia } from '@/lib/media'

function ImageGrid({ images }: { images: StoredMedia[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const label = (img: StoredMedia, i: number) => img.caption || t('detail.imageN', { n: i + 1 })
  const current = open === null ? null : images[open]

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.id}>
            <figure className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={t('detail.openImage', { caption: label(img, i) })}
                className="group bg-muted hover:border-primary/40 focus-visible:ring-ring overflow-hidden rounded-md border transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
              >
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-contain transition-transform duration-250 group-hover:scale-[1.02]"
                />
              </button>
              {img.caption && (
                <figcaption className="text-muted-foreground line-clamp-2 text-xs break-words">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[92dvh] gap-3 sm:max-w-3xl">
          {current && open !== null && (
            <>
              <DialogTitle className="pr-6 text-sm">{label(current, open)}</DialogTitle>
              <DialogDescription className="sr-only">{t('field.images')}</DialogDescription>
              <img
                src={current.url}
                alt={label(current, open)}
                className="bg-muted max-h-[78dvh] w-full rounded-md border object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Ảnh: lưới thu nhỏ, bấm xem lớn. Video: trình phát có sẵn của trình duyệt. Dùng cho bug lẫn đề xuất. */
export function MediaGallery({ media }: { media: StoredMedia[] }) {
  const { t } = useI18n()
  const images = media.filter((m) => m.type !== 'video')
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
                <figcaption className="text-muted-foreground flex flex-wrap gap-x-2 text-xs break-words">
                  {v.caption && <span>{v.caption}</span>}
                  <a href={v.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {t('detail.openVideo')}
                  </a>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
      {images.length > 0 && <ImageGrid images={images} />}
    </div>
  )
}
