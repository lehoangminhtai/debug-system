import {
  AppWindow,
  CheckCheck,
  ChevronDown,
  ChevronsUp,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Equal,
  Monitor,
  OctagonAlert,
  Server,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import type { Platform, Severity, Status } from '@/types'

export const TONES = {
  destructive: 'bg-destructive-bg text-destructive-text',
  warning: 'bg-warning-bg text-warning-text',
  info: 'bg-info-bg text-info-text',
  primary: 'bg-primary-light text-primary-hover',
  success: 'bg-success-bg text-success-text',
  neutral: 'bg-muted text-muted-foreground',
} as const

export type Tone = keyof typeof TONES

/** Chỉ màu chữ — cho icon đứng riêng */
export const TONE_TEXT: Record<Tone, string> = {
  destructive: 'text-destructive-text',
  warning: 'text-warning-text',
  info: 'text-info-text',
  primary: 'text-primary-hover',
  success: 'text-success-text',
  neutral: 'text-muted-foreground',
}

interface Meta {
  tone: Tone
  icon: LucideIcon
}

export const STATUS_META: Record<Status, Meta> = {
  new: { tone: 'neutral', icon: CircleDashed }, // chưa ai nhận
  fixing: { tone: 'warning', icon: CircleDot }, // đang xử lý
  fixed: { tone: 'primary', icon: CircleCheck }, // chờ người báo kiểm tra
  closed: { tone: 'success', icon: CheckCheck },
}

export const SEVERITY_META: Record<Severity, Meta> = {
  critical: { tone: 'destructive', icon: OctagonAlert },
  high: { tone: 'warning', icon: ChevronsUp },
  medium: { tone: 'info', icon: Equal },
  low: { tone: 'neutral', icon: ChevronDown },
}

export const PLATFORM_ICON: Record<Platform, LucideIcon> = {
  backend: Server,
  frontend: Monitor,
  mobile: Smartphone,
  window: AppWindow,
}

export const PLATFORM_TONE: Record<Platform, Tone> = {
  backend: 'info',
  frontend: 'primary',
  mobile: 'warning',
  window: 'success',
}
