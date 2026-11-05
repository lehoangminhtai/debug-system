import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { IMAGE_TYPES, MAX_IMAGES, MAX_IMAGE_BYTES, downscaleImage } from '@/lib/image'
import { cn } from '@/lib/utils'

export interface ImageValue {
  url: string
  caption: string
}

interface Props {
  id: string
  value: ImageValue[]
  onChange: (value: ImageValue[]) => void
  describedBy?: string
}

export function ImageField({ id, value, onChange, describedBy }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const accepted: File[] = []
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) toast.error(t('toast.imageInvalid', { name: file.name }))
      else if (file.size > MAX_IMAGE_BYTES) toast.error(t('toast.imageTooLarge', { name: file.name }))
      else accepted.push(file)
    }
    const room = MAX_IMAGES - value.length
    if (accepted.length > room) toast.error(t('toast.imageLimit', { max: MAX_IMAGES }))
    const batch = accepted.slice(0, Math.max(0, room))
    if (!batch.length) return

    setProcessing(true)
    try {
      const urls = await Promise.all(batch.map((f) => downscaleImage(f)))
      onChange([...value, ...urls.map((url) => ({ url, caption: '' }))])
    } catch {
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const full = value.length >= MAX_IMAGES

  return (
    <div className="flex flex-col gap-3">
      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors duration-150',
            dragOver ? 'border-ring bg-primary-light/40' : 'bg-muted',
          )}
        >
          {processing ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('form.processing')}
            </p>
          ) : (
            <>
              <ImagePlus className="text-muted-foreground size-5" aria-hidden />
              <p className="text-muted-foreground text-sm">
                {t('form.dropImages')}{' '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => inputRef.current?.click()}
                  aria-describedby={describedBy}
                >
                  {t('action.chooseImages')}
                </Button>
              </p>
            </>
          )}
          <input
            ref={inputRef}
            id={id}
            aria-label={t('field.images')}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      )}

      {value.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((img, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-lg border p-2">
              <div className="relative">
                <img
                  src={img.url}
                  alt={img.caption}
                  className="bg-muted aspect-[4/3] w-full rounded-md object-contain"
                />
                <Hint label={t('action.removeImage', { n: i + 1 })}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="bg-card/90 absolute top-1.5 right-1.5 size-7"
                    aria-label={t('action.removeImage', { n: i + 1 })}
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </Hint>
              </div>
              <Input
                value={img.caption}
                onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, caption: e.target.value } : v)))}
                maxLength={200}
                placeholder={t('form.captionPlaceholder')}
                aria-label={t('form.captionLabel', { n: i + 1 })}
                className="h-8"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
