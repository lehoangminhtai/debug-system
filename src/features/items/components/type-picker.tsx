import { Bug as BugIcon, Check, Lightbulb } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import type { ItemType } from '../hooks/use-item-filters'

/** Chọn loại cần tạo — 2 thẻ radio, đổi loại giữ nguyên ?project= */
export function TypePicker({ value, onChange }: { value: ItemType; onChange: (v: ItemType) => void }) {
  const { t } = useI18n()
  const items = [
    { v: 'bug' as const, icon: BugIcon, title: t('type.bug'), hint: t('type.bugHint'), tone: 'destructive' },
    { v: 'feature' as const, icon: Lightbulb, title: t('type.feature'), hint: t('type.featureHint'), tone: 'info' },
  ]
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{t('form.chooseType')}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => {
          const checked = value === i.v
          return (
            <label
              key={i.v}
              className={cn(
                'bg-card flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-150',
                'hover:border-foreground/30 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
                checked && i.tone === 'destructive' && 'border-destructive bg-destructive-bg',
                checked && i.tone === 'info' && 'border-info bg-info-bg',
              )}
            >
              <input
                type="radio"
                name="item-type"
                value={i.v}
                checked={checked}
                onChange={() => onChange(i.v)}
                className="sr-only"
              />
              <i.icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  i.tone === 'destructive' ? 'text-destructive-text' : 'text-info-text',
                )}
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{i.title}</span>
                <span className="text-muted-foreground text-xs">{i.hint}</span>
              </span>
              <Check className={cn('mt-0.5 size-4 shrink-0', !checked && 'invisible')} aria-hidden />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
