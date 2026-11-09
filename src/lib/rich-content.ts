// Nội dung rich text của bug / đề xuất (field `content`, HTML) — dùng chung cho editor và trang chi tiết.
import { Node, mergeAttributes, type Extensions } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

/** `<video src controls>` — Tiptap không có sẵn node video */
const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ src: { default: null } }),
  parseHTML: () => [{ tag: 'video[src]' }],
  renderHTML: ({ HTMLAttributes }) => ['video', mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata' })],
})

/**
 * Chỉ các thẻ backend cho phép (RichContent::sanitizer): không heading, không bảng.
 * Cùng một danh sách cho editor và trang chi tiết nên nội dung hiển thị đúng như lúc gõ.
 */
export function richExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        // blob: = tệp vừa chèn, chưa lưu
        isAllowedUri: (url, { defaultValidate }) => url.startsWith('blob:') || defaultValidate(url),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    Image,
    Video,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ]
}
