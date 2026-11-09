import { EditorContent, useEditor } from '@tiptap/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/i18n'
import { richExtensions } from '@/lib/rich-content'

/**
 * Hiển thị `content` ở trang chi tiết. Dùng Tiptap chỉ đọc chứ không `dangerouslySetInnerHTML`:
 * chỉ các node đã khai báo được vẽ ra (backend đã lọc HTML, đây là lớp thứ hai). Bấm ảnh → xem lớn.
 */
export function RichContentView({ html, empty }: { html: string; empty: string }) {
  const { t } = useI18n()
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)
  const editor = useEditor(
    {
      extensions: richExtensions(),
      content: html,
      editable: false,
      editorProps: {
        attributes: { class: 'rich-content' },
        handleClickOn: (_view, _pos, node) => {
          if (node.type.name !== 'image') return false
          setImage({ src: node.attrs.src, alt: node.attrs.alt ?? '' })
          return true
        },
      },
    },
    [html],
  )

  if (!html) return <p className="text-muted-foreground text-sm">{empty}</p>

  return (
    <>
      <EditorContent editor={editor} />
      <Dialog open={!!image} onOpenChange={(o) => !o && setImage(null)}>
        <DialogContent className="max-h-[92dvh] gap-3 sm:max-w-4xl">
          <DialogTitle className="pr-6 text-sm">{image?.alt || t('detail.image')}</DialogTitle>
          <DialogDescription className="sr-only">{t('detail.image')}</DialogDescription>
          {image && (
            <img
              src={image.src}
              alt={image.alt}
              className="bg-muted max-h-[80dvh] w-full rounded-md border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
