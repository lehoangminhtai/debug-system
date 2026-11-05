import { ShieldAlert, Target, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { PLATFORM_ICON, SEVERITY_META, STATUS_META, TONES, type Tone } from '@/lib/meta'
import { cn } from '@/lib/utils'
import type { Platform, Severity, Status } from '@/types'

interface PillProps {
  tone: Tone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

export function Pill({ tone, icon: Icon, children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap ring-1 ring-current/15 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden strokeWidth={2} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n()
  const m = STATUS_META[status]
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {t(`status.${status}`)}
    </Pill>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useI18n()
  const m = SEVERITY_META[severity]
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {t(`severity.${severity}`)}
    </Pill>
  )
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  const { t } = useI18n()
  return (
    <Pill tone="neutral" icon={PLATFORM_ICON[platform]}>
      {t(`platform.${platform}`)}
    </Pill>
  )
}

export function CoreBadge() {
  const { t } = useI18n()
  return (
    <Pill tone="neutral" icon={Target} className="text-foreground">
      {t('field.core')}
    </Pill>
  )
}

export function MustFixBadge() {
  const { t } = useI18n()
  return (
    <Pill tone="destructive" icon={ShieldAlert}>
      {t('handling.mustFixShort')}
    </Pill>
  )
}
