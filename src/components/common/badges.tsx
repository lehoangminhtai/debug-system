import { Bug as BugIcon, Lightbulb, ShieldAlert, Target, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import {
  FEATURE_STATUS_META,
  PLATFORM_ICON,
  PLATFORM_TONE,
  PRIORITY_META,
  SEVERITY_META,
  STATUS_META,
  TONES,
  type Tone,
} from '@/lib/meta'
import { cn } from '@/lib/utils'
import type { FeatureStatus, Platform, Priority, Severity, Status } from '@/types'

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

/** Một hoặc nhiều nền tảng (bug có thể ảnh hưởng nhiều nền tảng) */
export function PlatformBadge({ platform }: { platform: Platform | Platform[] }) {
  const { t } = useI18n()
  return (
    <>
      {[platform].flat().map((p) => (
        <Pill key={p} tone={PLATFORM_TONE[p]} icon={PLATFORM_ICON[p]}>
          {t(`platform.${p}`)}
        </Pill>
      ))}
    </>
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

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n()
  const m = PRIORITY_META[priority]
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {t(`priority.${priority}`)}
    </Pill>
  )
}

export function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  const { t } = useI18n()
  const m = FEATURE_STATUS_META[status]
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {t(`featureStatus.${status}`)}
    </Pill>
  )
}

/** Loại mục trong bảng gộp: Bug (đỏ) | Tính năng mong muốn (xanh) */
export function TypeBadge({ kind }: { kind: 'bug' | 'feature' }) {
  const { t } = useI18n()
  return kind === 'bug' ? (
    <Pill tone="destructive" icon={BugIcon}>
      {t('type.bug')}
    </Pill>
  ) : (
    <Pill tone="info" icon={Lightbulb}>
      {t('type.feature')}
    </Pill>
  )
}
