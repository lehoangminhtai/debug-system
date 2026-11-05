import { cn, initials } from '@/lib/utils'

/** Avatar chữ cái đầu. Tên luôn hiển thị kèm bên cạnh hoặc qua aria-label của phần tử cha. */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-card text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
        className,
      )}
    >
      {initials(name).slice(0, 1)}
    </span>
  )
}

export function UserName({ name, fallback }: { name: string | null; fallback: string }) {
  if (!name) return <span className="text-muted-foreground">{fallback}</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <UserAvatar name={name} />
      {name}
    </span>
  )
}
