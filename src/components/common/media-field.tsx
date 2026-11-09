import { Film, ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { downscaleImageBlob } from '@/lib/image'
import { MEDIA_ACCEPT, isImageFile, isVideoFile, type MediaValue } from '@/lib/media'
import { cn } from '@/lib/utils'

const MB = 1024 * 1024
const formatMB = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`

/**
 * Ảnh: nén WebP cạnh dài 1600px (GIF giữ nguyên để không mất ảnh động; ảnh không nén được thì gửi file gốc).
 * Video: gửi file gốc. Không giới hạn số file hay dung lượng.
 */
async function prepare(file: File): Promise<MediaValue> {
  const isVideo = isVideoFile(file)
  let blob: Blob = file
  if (!isVideo && file.type !== 'image/gif') blob = await downscaleImageBlob(file).catch(() => file)
  const name = blob === file ? file.name : file.name.replace(/\.[^.]+$/, '') + '.webp'
  // ponytail: object URL không thu hồi — chỉ vài file mỗi lần mở form, mất khi tải lại trang
  return {
    file: blob,
    name,
    type: isVideo ? 'video' : 'image',
    url: URL.createObjectURL(blob),
    caption: '',
    size: blob.size,
  }
}

interface Props {
  id: string
  value: MediaValue[]
  onChange: (value: MediaValue[]) => void
  describedBy?: string
  invalid?: boolean
}

/** Chọn / kéo thả ảnh và video minh chứng — dùng chung cho form bug và form đề xuất tính năng */
export function MediaField({ id, value, onChange, describedBy, invalid }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const batch: File[] = []
    for (const file of files) {
      if (!isVideoFile(file) && !isImageFile(file)) toast.error(t('toast.mediaInvalid', { name: file.name }))
      else batch.push(file)
    }
    if (!batch.length) return

    setProcessing(true)
    try {
      onChange([...value, ...(await Promise.all(batch.map(prepare)))])
    } catch {
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      void addFiles(e.dataTransfer.files)
    },
  }
  const pickFiles = () => inputRef.current?.click()

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id={id}
        aria-label={t('field.media')}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void addFiles(e.target.files)}
      />

      {value.length === 0 ? (
        <div
          {...dropProps}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors duration-150',
            dragOver ? 'border-ring bg-primary-light/40' : 'bg-muted',
            invalid && 'border-destructive',
          )}
        >
          {processing ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('form.processing')}
            </p>
          ) : (
            <>
              <span className="text-muted-foreground flex gap-1.5" aria-hidden>
                <ImagePlus className="size-5" />
                <Film className="size-5" />
              </span>
              <p className="text-muted-foreground text-sm">
                {t('feature.dropMedia')}{' '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={pickFiles}
                  aria-describedby={describedBy}
                >
                  {t('action.chooseMedia')}
                </Button>
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((m, i) => (
            <li key={m.url} className="flex flex-col gap-2 rounded-lg border p-2">
              <div className="relative">
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    controls
                    preload="metadata"
                    className="bg-muted aspect-[4/3] w-full rounded-md object-contain"
                  />
                ) : (
                  <img src={m.url} alt={m.caption} className="bg-muted aspect-[4/3] w-full rounded-md object-contain" />
                )}
                {(m.size > 0 || m.type === 'video') && (
                  <span className="bg-card/90 absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs tabular-nums">
                    {m.type === 'video' && <Film className="size-3.5" aria-hidden />}
                    {m.size > 0 && formatMB(m.size)}
                  </span>
                )}
                <Hint label={t('action.removeMedia', { n: i + 1 })}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="bg-card/90 absolute top-1.5 right-1.5 size-7"
                    aria-label={t('action.removeMedia', { n: i + 1 })}
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </Hint>
              </div>
              <Input
                value={m.caption}
                onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, caption: e.target.value } : v)))}
                placeholder={t('form.captionPlaceholder')}
                aria-label={t('feature.mediaCaption', { n: i + 1 })}
                className="h-8"
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              {...dropProps}
              onClick={pickFiles}
              disabled={processing}
              aria-label={t('action.chooseMedia')}
              aria-describedby={describedBy}
              className={cn(
                'text-muted-foreground hover:border-primary hover:bg-primary-light/40 hover:text-primary focus-visible:ring-ring flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors duration-150 outline-none focus-visible:ring-2 disabled:cursor-wait',
                dragOver ? 'border-ring bg-primary-light/40' : 'bg-muted',
              )}
            >
              {processing ? (
                <Loader2 className="size-8 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-10" aria-hidden />
              )}
              <span className="text-sm font-medium">{processing ? t('form.processing') : t('action.chooseMedia')}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
