import { Bug, Languages, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router-dom'
import { Hint } from '@/components/common/hint'
import { UserAvatar } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ProjectNav } from '@/features/projects/components/project-nav'
import { LOCALES, setLocale, useI18n, type Locale } from '@/i18n'
import { createPersistedStore } from '@/lib/persisted-store'
import { cn } from '@/lib/utils'
import { logout, useSession } from '@/services/auth'
import { useMe } from '@/services/queries'

type SidebarMode = 'expanded' | 'collapsed'
// Trạng thái thu gọn sidebar (desktop) — lưu localStorage, giữ sau khi tải lại
const sidebarStore = createPersistedStore<SidebarMode>(
  'debugs.sidebar',
  'expanded',
  (v): v is SidebarMode => v === 'expanded' || v === 'collapsed',
)

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/all"
      className={cn(
        'focus-visible:ring-ring flex items-center gap-2.5 rounded-md py-1 whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none',
        collapsed ? 'justify-center' : 'px-2',
      )}
    >
      <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
        <Bug className="size-5" aria-hidden />
      </span>
      <span
        className={
          collapsed
            ? 'sr-only'
            : 'text-4xl leading-none font-black tracking-tight [-webkit-text-stroke:1px_currentColor]'
        }
      >
        DTS
      </span>
    </Link>
  )
}

function SidebarBody({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggle?: () => void
}) {
  const { t } = useI18n()
  const toggleLabel = t(collapsed ? 'nav.expand' : 'nav.collapse')
  return (
    <div className="flex h-full flex-col">
      {/* Cao bằng header (56px) để đường kẻ thẳng hàng với đường kẻ dưới header */}
      <div className="flex h-14 shrink-0 items-center border-b px-3">
        <Brand collapsed={collapsed} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 p-3">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <ProjectNav onNavigate={onNavigate} collapsed={collapsed} />
        </div>
        {onToggle && (
          <Hint label={toggleLabel} side="right" disabled={!collapsed}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar"
              className={cn(
                'text-muted-foreground whitespace-nowrap',
                collapsed ? 'justify-center px-0' : 'justify-start px-2',
              )}
            >
              {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
              {!collapsed && toggleLabel}
            </Button>
          </Hint>
        )}
      </div>
    </div>
  )
}

export function LanguageSelect() {
  const { t, locale } = useI18n()
  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger size="sm" aria-label={t('header.language')} className="gap-1.5">
        <Languages className="text-muted-foreground size-4" aria-hidden />
        <SelectValue>
          <span className="sm:hidden">{LOCALES[locale].short}</span>
          <span className="hidden sm:inline">{LOCALES[locale].label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(LOCALES) as Locale[]).map((l) => (
          <SelectItem key={l} value={l} lang={l}>
            {LOCALES[l].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function HeaderControls() {
  const { t } = useI18n()
  const user = useMe().data?.name ?? ''
  return (
    <div className="ml-auto flex items-center gap-3">
      <LanguageSelect />

      {/* Khối người dùng: avatar + lời chào (từ sm) + đăng xuất nằm chung một khung */}
      <div className="bg-card flex items-center gap-2.5 rounded-lg border p-1 sm:pr-1.5 sm:pl-1">
        <UserAvatar
          name={user}
          className="bg-primary-light text-primary-hover ring-primary/20 size-8 border-transparent text-base ring-2"
        />
        <p className="hidden flex-col leading-tight sm:flex">
          <span className="text-muted-foreground text-xs">{t('header.welcome')}</span>
          <span className="text-foreground text-sm font-semibold">{user}</span>
        </p>
        <div aria-hidden className="bg-border mx-0.5 h-6 w-px" />
        <Hint label={t('auth.logout')}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={t('auth.logout')}
            onClick={logout}
          >
            <LogOut />
          </Button>
        </Hint>
      </div>
    </div>
  )
}

/** Sau khi đổi trang: đưa focus về <main> để screen reader đọc từ đầu nội dung mới (title đã cập nhật) */
function useFocusMainOnRouteChange() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
}

export function AppLayout() {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigation = useNavigation()
  const collapsed = sidebarStore.use() === 'collapsed'
  const session = useSession()
  useFocusMainOnRouteChange()
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-dvh">
      <ScrollRestoration />
      {navigation.state !== 'idle' && (
        <div
          role="progressbar"
          aria-label={t('nav.loadingPage')}
          className="bg-ring fixed inset-x-0 top-0 z-50 h-0.5 origin-left animate-pulse"
        />
      )}
      <a
        href="#main"
        // Hash router: để mặc định thì URL thành #main → route /main (404). Chỉ chuyển focus, không đổi URL.
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('nav.skip')}
      </a>

      <aside
        id="app-sidebar"
        className={cn(
          'bg-sidebar sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r transition-[width] duration-250 ease-out lg:block',
          collapsed ? 'w-16' : 'w-62',
        )}
      >
        <SidebarBody collapsed={collapsed} onToggle={() => sidebarStore.set(collapsed ? 'expanded' : 'collapsed')} />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-sidebar w-72 gap-0 p-0">
          <SheetTitle className="sr-only">{t('nav.main')}</SheetTitle>
          <SheetDescription className="sr-only">{t('app.tagline')}</SheetDescription>
          <SidebarBody onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/95 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label={t('nav.openMenu')}
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <span className="text-lg font-bold tracking-tight lg:hidden">DTS</span>
          <HeaderControls />
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 outline-none sm:p-6 xl:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
