import { Check, ChevronDown, IdCard, Search } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useState, type ComponentProps } from 'react'
import { Pill } from '@/components/common/badges'
import { UserName } from '@/components/common/user-avatar'
import { useDebounced } from '@/hooks/use-debounced'
import { useI18n } from '@/i18n'
import type { Person } from '@/services/api'
import { useUserSearch } from '@/services/queries'
import { cn } from '@/lib/utils'

interface Props extends Omit<ComponentProps<'button'>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  people: Pick<Person, 'name' | 'employeeId'>[]
  /** Lựa chọn "chưa giao" đứng đầu danh sách */
  none?: { value: string; label: string }
  placeholder?: string
}

function EmployeeId({ id }: { id: string }) {
  return (
    <Pill tone="primary" icon={IdCard} className="font-mono tracking-tight tabular-nums">
      {id}
    </Pill>
  )
}

/**
 * Ô chọn người: chiều cao danh sách cố định (cuộn), có ô tìm kiếm ở trên.
 * Chưa gõ → `people` (danh bạ + tên cũ); gõ → server tìm (User@index?q=, debounce).
 */
export function PersonSelect({ value, onValueChange, people, none, placeholder, className, ...rest }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const needle = q.trim()
  const debounced = useDebounced(needle)
  const search = useUserSearch(open ? debounced : '')
  const matches = needle ? (search.data ?? []) : people
  const searching = !!needle && (needle !== debounced || search.isFetching)
  // "Chưa giao" là lựa chọn của giao diện, không phải dữ liệu → chỉ hiện khi chưa tìm
  const showNone = none && !needle
  const pick = (v: string) => {
    onValueChange(v)
    setOpen(false)
  }
  const currentPerson = people.find((p) => p.name === value)
  const current = none && value === none.value ? none.label : value

  const row = (v: string, children: React.ReactNode) => (
    <button
      key={v}
      type="button"
      role="option"
      aria-selected={v === value}
      onClick={() => pick(v)}
      className="hover:bg-accent focus-visible:bg-accent flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none"
    >
      {children}
      {v === value && <Check className="size-4 shrink-0" aria-hidden />}
    </button>
  )

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQ('')
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          // Ô hẹp mà tên dài vẫn xem được đầy đủ khi rê chuột
          title={currentPerson?.employeeId ? `${current} · ${currentPerson.employeeId}` : current || undefined}
          className={cn(
            'border-input bg-card focus-visible:ring-ring aria-invalid:border-destructive flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...rest}
        >
          {current ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{current}</span>
              {currentPerson?.employeeId && <EmployeeId id={currentPerson.employeeId} />}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          // Rộng theo tên dài nhất (không hẹp hơn ô chọn), tối đa 28rem và không tràn màn hình
          className="bg-popover text-popover-foreground z-50 w-max max-w-[min(28rem,calc(100vw-2rem))] min-w-[max(12rem,var(--radix-popover-trigger-width))] rounded-md border shadow-md"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('common.search')}
              aria-label={t('common.search')}
              className="placeholder:text-muted-foreground h-9 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div role="listbox" className="max-h-56 overflow-y-auto p-1">
            {showNone && row(none.value, <span>{none.label}</span>)}
            {matches.map((p) =>
              row(
                p.name,
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <UserName name={p.name} fallback="" />
                  {p.employeeId && <EmployeeId id={p.employeeId} />}
                </span>,
              ),
            )}
            {!showNone && !matches.length && (
              <p className="text-muted-foreground px-2 py-3 text-center text-sm" aria-live="polite">
                {searching ? t('common.loading') : search.isError ? t('error.iam_unavailable') : t('common.noResults')}
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
