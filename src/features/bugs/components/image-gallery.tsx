import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/i18n'
import type { BugImage } from '@/types'

export function ImageGallery({ images }: { images: BugImage[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const label = (img: BugImage, i: number) => img.caption || t('detail.imageN', { n: i + 1 })
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
