import { Extension, EditorContent, useEditor, type ChainedCommands, type Editor } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import {
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { useI18n, type TKey } from '@/i18n'
import { downscaleImageBlob } from '@/lib/image'
import { MEDIA_ACCEPT, isAttachmentFile, isImageFile, isVideoFile } from '@/lib/media'
import { addPendingFile } from '@/lib/pending-files'
import { cn } from '@/lib/utils'
import { richExtensions } from '@/lib/rich-content'

type OnFiles = (editor: Editor, files: File[], pos?: number) => void

/** Dán (Ctrl+V ảnh chụp màn hình) hoặc kéo thả file vào nội dung */
const FileHandler = Extension.create<{ onFiles: OnFiles }>({
  name: 'fileHandler',
  addOptions: () => ({ onFiles: () => {} }),
  addProseMirrorPlugins() {
    const { editor, options } = this
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const files = [...(event.clipboardData?.files ?? [])]
            if (!files.length) return false
            options.onFiles(editor, files)
            return true
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = [...(event.dataTransfer?.files ?? [])]
            if (moved || !files.length) return false
            event.preventDefault()
            options.onFiles(editor, files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos)
            return true
          },
        },
      }),
    ]
  },
})

/**
 * Ảnh: nén WebP cạnh dài 1600px (GIF giữ nguyên để không mất ảnh động; nén lỗi thì gửi file gốc).
 * Video, tệp: gửi file gốc — tệp hiện thành link tên file. Không giới hạn số file hay dung lượng.
 */
async function insertFiles(editor: Editor, files: File[], pos?: number) {
  const nodes = await Promise.all(
    files.map(async (file) => {
      if (isImageFile(file)) {
        const blob = file.type === 'image/gif' ? file : await downscaleImageBlob(file).catch(() => file)
        const name = blob === file ? file.name : file.name.replace(/\.[^.]+$/, '') + '.webp'
        return { type: 'image', attrs: { src: addPendingFile(blob, name), alt: file.name.replace(/\.[^.]+$/, '') } }
      }
      const src = addPendingFile(file, file.name)
      if (isVideoFile(file)) return { type: 'video', attrs: { src } }
      return {
        type: 'paragraph',
        content: [{ type: 'text', text: file.name, marks: [{ type: 'link', attrs: { href: src } }] }],
      }
    }),
  )
  const chain = editor.chain().focus()
  ;(pos === undefined ? chain : chain.setTextSelection(pos)).insertContent(nodes).run()
}

const TOOLS: [LucideIcon, TKey, string, (c: ChainedCommands) => ChainedCommands][] = [
  [Bold, 'editor.bold', 'bold', (c) => c.toggleBold()],
  [Italic, 'editor.italic', 'italic', (c) => c.toggleItalic()],
  [Underline, 'editor.underline', 'underline', (c) => c.toggleUnderline()],
  [Strikethrough, 'editor.strike', 'strike', (c) => c.toggleStrike()],
  [Code, 'editor.code', 'code', (c) => c.toggleCode()],
  [List, 'editor.bulletList', 'bulletList', (c) => c.toggleBulletList()],
  [ListOrdered, 'editor.orderedList', 'orderedList', (c) => c.toggleOrderedList()],
  [Quote, 'editor.quote', 'blockquote', (c) => c.toggleBlockquote()],
  [SquareCode, 'editor.codeBlock', 'codeBlock', (c) => c.toggleCodeBlock()],
]

interface Props {
  id: string
  /** HTML ban đầu — chỉ đọc lúc mở form */
  value: string
  onChange: (html: string) => void
  placeholder?: string
  labelledBy?: string
  describedBy?: string
  /** Bình luận: ô thấp hơn, bỏ dòng hướng dẫn kéo thả (chỉ hiện khi đang xử lý file) */
  compact?: boolean
  autoFocus?: boolean
}

/** Soạn nội dung rich text kèm ảnh/video/tệp — dùng chung cho form bug và form đề xuất tính năng */
export function RichEditor({ id, value, onChange, placeholder, labelledBy, describedBy, compact, autoFocus }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)

  const addFiles: OnFiles = async (editor, list, pos) => {
    const files = list.filter((file) => {
      const ok = isImageFile(file) || isVideoFile(file) || isAttachmentFile(file)
      if (!ok) toast.error(t('toast.mediaInvalid', { name: file.name }))
      return ok
    })
    if (!files.length) return
    setProcessing(true)
    try {
      await insertFiles(editor, files, pos)
    } catch {
      toast.error(t('error.generic'))
    } finally {
      setProcessing(false)
    }
  }

  const editor = useEditor({
    extensions: [
      ...richExtensions(placeholder),
      FileHandler.configure({ onFiles: (e, f, p) => void addFiles(e, f, p) }),
    ],
    content: value,
    autofocus: autoFocus ? 'end' : false,
    // thanh công cụ cần vẽ lại theo vị trí con trỏ (nút đậm/nghiêng đang bật)
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy && { 'aria-labelledby': labelledBy }),
        ...(describedBy && { 'aria-describedby': describedBy }),
        class: cn(
          'rich-content px-3 py-2 outline-none',
          // compact (bình luận): ảnh/video dán vào chỉ là ảnh nhỏ xem trước (file gửi lên vẫn nguyên), ô không cao
          // quá 12rem — dài hơn thì cuộn trong ô, nút Gửi/Hủy bên dưới luôn trong tầm mắt
          compact ? 'max-h-48 min-h-16 overflow-y-auto [&_img]:max-h-24 [&_img]:w-auto [&_video]:max-h-28' : 'min-h-40',
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  return (
    <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring dark:bg-input/30 rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-2">
      <div
        role="toolbar"
        aria-label={t('editor.toolbar')}
        aria-controls={id}
        className="flex flex-wrap items-center gap-0.5 border-b p-1"
      >
        {TOOLS.map(([Icon, label, name, run]) => (
          <Hint key={name} label={t(label)}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t(label)}
              aria-pressed={editor.isActive(name)}
              className="aria-pressed:bg-accent aria-pressed:text-primary"
              onClick={() => run(editor.chain().focus()).run()}
            >
              <Icon />
            </Button>
          </Hint>
        ))}
        <span className="bg-border mx-1 h-5 w-px" aria-hidden />
        <Hint label={t('editor.attach')}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('editor.attach')}
            disabled={processing}
            onClick={() => inputRef.current?.click()}
          >
            {processing ? <Loader2 className="animate-spin" /> : <Paperclip />}
          </Button>
        </Hint>
        <span className="bg-border mx-1 h-5 w-px" aria-hidden />
        <Hint label={t('editor.undo')}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('editor.undo')}
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 />
          </Button>
        </Hint>
        <Hint label={t('editor.redo')}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('editor.redo')}
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 />
          </Button>
        </Hint>
      </div>

      <EditorContent editor={editor} />

      {(!compact || processing) && (
        <p
          className="text-muted-foreground flex items-center gap-1.5 border-t px-3 py-1.5 text-xs"
          role={processing ? 'status' : undefined}
        >
          {processing && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {processing ? t('form.processing') : t('editor.hint')}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void addFiles(editor, [...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}
