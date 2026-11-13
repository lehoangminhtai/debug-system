import { ArrowUp, ChevronDown, Loader2, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useElementHeight } from '@/hooks/use-element-height'
import { createPersistedStore } from '@/lib/persisted-store'
import { Hint } from '@/components/common/hint'
import { RichContentView, RichEditor } from '@/components/common/rich-text'
import { UserAvatar } from '@/components/common/user-avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { LOCALES, useI18n } from '@/i18n'
import { collapsedStore, isNewer, markSeen, seenAt } from '@/lib/comment-seen'
import { extractUploads } from '@/lib/pending-files'
import { cn, formatTs, relativeTime } from '@/lib/utils'
import { useDeleteComment, useSaveComment } from '@/services/queries'
import type { Comment, CommentKind } from '@/types'

/** Chữ thuần của bình luận cho dòng tóm tắt khi thu gọn. DOMParser chỉ dựng cây, không chạy script / tải ảnh. */
const plainText = (html: string) =>
  (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()

interface Props {
  kind: CommentKind
  code: string
  comments: Comment[]
}

/** Chiều cao người dùng đã kéo (px, '' = mặc định) — nhớ chung cho mọi bug/đề xuất */
const heightStore = createPersistedStore<string>('debugs.commentsHeight', '', (v): v is string => /^\d*$/.test(v))

/**
 * Bình luận ở đầu trang chi tiết, cạnh khối Thông tin. Mặc định mở; thu gọn còn một dòng tóm tắt, nhớ chung cho mọi
 * bug/đề xuất. Có bình luận của người khác chưa xem → tự mở và gắn nhãn MỚI. Chỉ tác giả sửa/xoá được (`mine`).
 *
 * Mới nhất lên đầu; ô viết nằm trên cùng và dính khi cuộn. xl (cột phải 4/12): cao vừa nội dung, kéo thanh ở đáy để đặt chiều cao tối đa,
 * vượt thì cuộn trong khối; thu gọn thì chiều cao chạy mượt về bằng dòng tiêu đề → phần Mô tả bên dưới trượt lên theo.
 */
export function CommentSection({ kind, code, comments }: Props) {
  const { t, locale } = useI18n()
  const [headRef, headHeight] = useElementHeight<HTMLHeadingElement>()
  const [innerRef, contentHeight] = useElementHeight<HTMLDivElement>()
  const save = useSaveComment(kind, code)
  const del = useDeleteComment(kind, code)
  const [draft, setDraft] = useState('')
  // RichEditor chỉ đọc `value` lúc mở → đổi key để làm trống ô sau khi gửi
  const [draftKey, setDraftKey] = useState(0)
  const [editing, setEditing] = useState<{ id: number; html: string } | null>(null)
  const [deleting, setDeleting] = useState<Comment | null>(null)
  const [composing, setComposing] = useState(false)

  // Mốc "đã xem" lúc mở trang — giữ nguyên trong lúc xem để nhãn MỚI không biến mất ngay
  const [since] = useState(() => seenAt(kind, code))
  const isNew = (c: Comment) => !c.mine && isNewer(c.createdAt, since)
  const newCount = comments.filter(isNew).length
  const latest = comments.at(-1)
  const latestAt = latest?.createdAt
  useEffect(() => {
    if (latestAt) markSeen(kind, code, latestAt)
  }, [kind, code, latestAt])

  const [collapsed, setCollapsed] = useState(() => collapsedStore.get() === '1' && newCount === 0)
  const toggle = () => {
    collapsedStore.set(collapsed ? '0' : '1')
    setCollapsed(!collapsed)
  }

  // API trả cũ → mới; hiện mới nhất lên đầu
  const newestFirst = [...comments].reverse()

  // Bình luận của người khác tới sau khi người dùng đã cuộn xuống (tải định kỳ 5s) → dòng "↑ N bình luận mới".
  // Chỉ cập nhật trong sự kiện cuộn, không cần effect: đang ở đầu khung thì thấy ngay, không cần báo.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scrolledDown, setScrolledDown] = useState(false)
  const [knownIds, setKnownIds] = useState(() => new Set(comments.map((c) => c.id)))
  const arrived = comments.filter((c) => !c.mine && !knownIds.has(c.id)).length
  const sendingNew = save.isPending && !save.variables?.id

  // Gửi/sửa xong → cuộn tới bình luận đó (cả trang lẫn khung), đưa focus vào và nháy viền ~2s để dễ nhận ra
  const [justSaved, setJustSaved] = useState<number | null>(null)
  useEffect(() => {
    if (justSaved === null) return
    const el = document.getElementById(`comment-${justSaved}`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el?.focus({ preventScroll: true })
    const timer = setTimeout(() => setJustSaved(null), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  // Chiều cao khi mở (xl): vừa đúng nội dung — nhiều bình luận thì dài, ít thì ngắn, không để khoảng trắng; tối đa vừa
  // màn hình (CSS max-h, khung dính khi cuộn). Kéo thanh ở đáy = đặt chiều cao TỐI ĐA riêng (nhớ chung cho mọi
  // bug/đề xuất), bấm đúp để bỏ. Nội dung dài hơn khung thì cuộn trong khung.
  // 28 = viền khối (2) + viền trên phần thân (1) + pb-3 (12) + thanh kéo (12 + viền 1).
  const [userHeight, setUserHeight] = useState(() => Number(heightStore.get()) || undefined)
  const naturalHeight =
    headHeight !== undefined && contentHeight !== undefined ? headHeight + contentHeight + 28 : undefined
  const openHeight =
    naturalHeight === undefined ? userHeight : userHeight ? Math.min(naturalHeight, userHeight) : naturalHeight
  const minHeight = (headHeight ?? 44) + 120 // vẫn thấy được ô viết + một bình luận
  const clampHeight = (h: number) => Math.round(Math.min(Math.max(h, minHeight), window.innerHeight - 88)) // 88 = header app (56) + lề trên/dưới
  const saveHeight = (h: number | undefined) => {
    setUserHeight(h)
    heightStore.set(h ? String(h) : '')
  }
  const sectionRef = useRef<HTMLElement>(null)
  const drag = useRef<{ y: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const when = (iso: string) => relativeTime(iso, LOCALES[locale].intl)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft || save.isPending) return
    save.mutate(
      { input: extractUploads(draft) },
      {
        onSuccess: (item) => {
          setDraft('')
          setDraftKey((k) => k + 1)
          setComposing(false) // gửi xong thu lại thành một dòng
          // API trả cũ → mới: bình luận cuối cùng của mình là cái vừa gửi (người khác có thể gửi cùng lúc)
          setJustSaved(item.comments?.filter((c) => c.mine).at(-1)?.id ?? null)
        },
      },
    )
  }

  const saveEdit = () => {
    if (!editing) return
    const { id } = editing
    save.mutate(
      { input: extractUploads(editing.html), id },
      {
        onSuccess: () => {
          setEditing(null)
          setJustSaved(id)
        },
      },
    )
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="comments-title"
      // Hai chiều cao đều là px đo được (height không chuyển động được tới/từ `auto`).
      // Chưa đo xong → biến CSS rỗng → `auto`. +2 = viền trên/dưới của khối.
      style={
        {
          '--comments-open-h': openHeight === undefined ? undefined : `${openHeight}px`,
          '--comments-head-h': headHeight === undefined ? undefined : `${headHeight + 2}px`,
        } as CSSProperties
      }
      className={cn(
        'bg-card flex flex-col overflow-hidden rounded-lg border',
        // Đang kéo thì bỏ hiệu ứng để khung bám theo chuột tức thì
        !dragging && 'xl:transition-[height] xl:duration-300 xl:ease-out',
        // Màn nhỏ: không có khối bên cạnh để khớp → chỉ giới hạn theo màn hình, thu gọn thì ẩn hẳn phần thân
        collapsed
          ? 'xl:h-(--comments-head-h)'
          : 'max-xl:max-h-[70dvh] xl:h-(--comments-open-h) xl:max-h-[calc(100dvh-5.5rem)]',
      )}
    >
      <h2 id="comments-title" ref={headRef}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="comments-body"
          className="hover:bg-accent/60 focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
        >
          <MessageSquare className="text-primary size-4 shrink-0" aria-hidden />
          <span className="text-base font-semibold">{t('comment.title')}</span>
          <span className="bg-muted text-muted-foreground rounded-sm px-1.5 text-xs font-medium tabular-nums">
            {comments.length}
          </span>
          {newCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {t('comment.newCount', { n: newCount })}
            </span>
          )}
          {latest && (
            <span className="text-muted-foreground hidden min-w-0 flex-1 truncate text-sm sm:block">
              {/* Thu gọn: kèm trích nội dung để vẫn biết có gì mới mà không cần mở */}
              <span className="text-foreground font-medium">{latest.author}</span>
              {collapsed && `: “${plainText(latest.content) || t('comment.attachmentOnly')}”`}
              {' · '}
              <time dateTime={latest.createdAt}>{when(latest.createdAt)}</time>
            </span>
          )}
          <ChevronDown
            className={cn(
              'text-muted-foreground ml-auto size-4 shrink-0 transition-transform duration-150',
              !collapsed && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </h2>

      {/* Luôn dựng để chiều cao chạy mượt; thu gọn thì `inert` (không focus/đọc được phần bị che) */}
      <div
        id="comments-body"
        ref={bodyRef}
        onScroll={(e) => {
          const down = e.currentTarget.scrollTop > 8
          setScrolledDown(down)
          if (!down) setKnownIds(new Set(comments.map((c) => c.id))) // đã thấy hết → không báo nữa
        }}
        inert={collapsed}
        className={cn(
          // scrollbar-gutter: khung bắt đầu/thôi cuộn thì bình luận bên trong không bị xô ngang
          'flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-y-auto overscroll-contain border-t px-4 pb-3',
          collapsed && 'max-xl:hidden',
        )}
      >
        {/* Bọc để đo chiều cao thật của nội dung → khung cao vừa đủ */}
        <div ref={innerRef}>
          {/* Ô viết luôn trên cùng, dính khi cuộn danh sách (nền đặc để che bình luận cuộn bên dưới) */}
          <div className="bg-card sticky top-0 z-10 pt-3 pb-2.5">
            {!composing ? (
              // Chỉ là một dòng, bấm mới bung editor
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="border-input text-muted-foreground hover:border-ring hover:text-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-1.5 text-left text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
              >
                {comments.length ? t('comment.write') : t('comment.first')}
              </button>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-2">
                <RichEditor
                  key={draftKey}
                  id="comment-new"
                  value=""
                  onChange={setDraft}
                  placeholder={t('comment.placeholder')}
                  labelledBy="comments-title"
                  compact
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={save.isPending}
                    onClick={() => {
                      setComposing(false)
                      setDraft('')
                      setDraftKey((k) => k + 1)
                    }}
                  >
                    {t('action.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={!draft || save.isPending} aria-busy={sendingNew}>
                    {sendingNew ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                    {t('comment.send')}
                  </Button>
                </div>
              </form>
            )}
            {/* Bình luận mới tới (tải định kỳ) trong lúc đang cuộn đọc bên dưới → báo, bấm để lên đầu.
                Trình duyệt tự giữ chỗ đang đọc (scroll anchoring) nên nội dung không bị xô. */}
            {scrolledDown && arrived > 0 && (
              <div className="flex justify-center pt-2" aria-live="polite">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs shadow-sm"
                  onClick={() => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <ArrowUp aria-hidden />
                  {t('comment.arrived', { n: arrived })}
                </Button>
              </div>
            )}
          </div>

          {newestFirst.length > 0 && (
            <ol className="flex flex-col gap-3">
              {newestFirst.map((c) => {
                const fresh = isNew(c)
                return (
                  // Avatar một cột bên trái; tên, giờ và khung nội dung cùng thẳng hàng ở cột phải
                  <li
                    key={c.id}
                    id={`comment-${c.id}`}
                    tabIndex={-1}
                    className={cn(
                      // scroll-mt: chừa chỗ cho ô viết đang dính ở đầu khung khi cuộn tới bình luận này
                      'group flex scroll-mt-16 gap-2.5 rounded-md transition-shadow duration-300 outline-none',
                      justSaved === c.id && 'ring-primary/50 ring-offset-card ring-2 ring-offset-4',
                    )}
                  >
                    <UserAvatar name={c.author || '?'} className="mt-0.5 size-7" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="min-w-0 truncate font-medium">{c.author || t('common.none')}</span>
                        <Hint label={formatTs(c.createdAt)}>
                          <time dateTime={c.createdAt} className="text-muted-foreground text-xs">
                            {when(c.createdAt)}
                          </time>
                        </Hint>
                        {c.updatedAt !== c.createdAt && (
                          <span className="text-muted-foreground text-xs">({t('comment.edited')})</span>
                        )}
                        {fresh && (
                          <span className="bg-primary text-primary-foreground rounded-sm px-1.5 text-[10px] font-semibold tracking-wide uppercase">
                            {t('comment.new')}
                          </span>
                        )}
                        {c.mine && editing?.id !== c.id && (
                          // Màn lớn: chỉ hiện khi rê chuột / focus; màn cảm ứng không có hover nên hiện sẵn
                          <span className="ml-auto flex gap-0.5 transition-opacity duration-150 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                            <Hint label={t('comment.edit')}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t('comment.edit')}
                                onClick={() => setEditing({ id: c.id, html: c.content })}
                              >
                                <Pencil />
                              </Button>
                            </Hint>
                            <Hint label={t('comment.delete')}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive-text"
                                aria-label={t('comment.delete')}
                                onClick={() => setDeleting(c)}
                              >
                                <Trash2 />
                              </Button>
                            </Hint>
                          </span>
                        )}
                      </div>

                      {editing?.id === c.id ? (
                        <div className="flex flex-col gap-2">
                          <RichEditor
                            id={`comment-edit-${c.id}`}
                            value={c.content}
                            onChange={(html) => setEditing({ id: c.id, html })}
                            labelledBy="comments-title"
                            compact
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                              {t('action.cancel')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!editing.html || save.isPending}
                              aria-busy={save.isPending}
                              onClick={saveEdit}
                            >
                              {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
                              {t('action.save')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Nội dung trong khung; ảnh/video nhỏ lại (bấm ảnh vẫn xem lớn). Bình luận mới: khung xanh nhạt
                        <div
                          className={cn(
                            'bg-muted/40 rounded-md border px-3 py-2 [&_img]:max-h-40 [&_video]:max-h-48',
                            fresh && 'border-primary/40 bg-primary-light/40',
                          )}
                        >
                          <RichContentView html={c.content} empty="" />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Thanh kéo đổi chiều cao (xl). Chuột/cảm ứng: kéo; bàn phím: ↑/↓; bấm đúp: bỏ chiều cao đã kéo (về vừa nội dung) */}
      {!collapsed && (
        <Hint label={t('comment.resize')}>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={t('comment.resize')}
            aria-valuenow={openHeight}
            tabIndex={0}
            onPointerDown={(e) => {
              if (!sectionRef.current) return
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { y: e.clientY, h: sectionRef.current.offsetHeight }
              setDragging(true)
            }}
            onPointerMove={(e) => {
              if (drag.current) setUserHeight(clampHeight(drag.current.h + e.clientY - drag.current.y))
            }}
            onPointerUp={() => {
              drag.current = null
              setDragging(false)
              saveHeight(userHeight)
            }}
            onDoubleClick={() => saveHeight(undefined)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
              e.preventDefault()
              const base = openHeight ?? sectionRef.current?.offsetHeight ?? minHeight
              saveHeight(clampHeight(base + (e.key === 'ArrowDown' ? 40 : -40)))
            }}
            className={cn(
              'group/resize hover:bg-accent focus-visible:ring-ring hidden h-3 shrink-0 cursor-row-resize touch-none items-center justify-center border-t transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset xl:flex',
              dragging && 'bg-accent',
            )}
          >
            <span
              className={cn(
                'bg-border group-hover/resize:bg-muted-foreground h-1 w-10 rounded-full transition-colors duration-150',
                dragging && 'bg-primary group-hover/resize:bg-primary',
              )}
              aria-hidden
            />
          </div>
        </Hint>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('comment.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('comment.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={del.isPending}
              onClick={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              {del.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
