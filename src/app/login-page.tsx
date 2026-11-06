import { Bug, Eye, EyeOff, KeyRound, Loader2, Lock, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { LanguageSelect } from '@/app/layouts/app-layout'
import { Field } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'
import { ApiError } from '@/services/api'
import { login, useSession } from '@/services/auth'
import { errorMessage } from '@/services/queries'

// Bọ bò ngẫu nhiên phía sau form: mỗi frame xoay hướng một chút rồi đi tới, chạm mép thì quay đầu.
const BUG_COLORS = [
  'text-red-500/70',
  'text-emerald-500/70',
  'text-amber-500/70',
  'text-sky-500/70',
  'text-violet-500/70',
]

function CrawlingBugs({ count = 5 }) {
  const refs = useRef<(SVGSVGElement | null)[]>([])
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bugs = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      a: Math.random() * Math.PI * 2,
      v: 0.6 + Math.random() * 0.8,
    }))
    let id = 0
    const tick = () => {
      bugs.forEach((b, i) => {
        b.a += (Math.random() - 0.5) * 0.3
        b.x += Math.cos(b.a) * b.v
        b.y += Math.sin(b.a) * b.v
        if (b.x < 0 || b.x > innerWidth - 40) b.a = Math.PI - b.a
        if (b.y < 0 || b.y > innerHeight - 40) b.a = -b.a
        b.x = Math.min(Math.max(b.x, 0), innerWidth - 40)
        b.y = Math.min(Math.max(b.y, 0), innerHeight - 40)
        // icon Bug hướng lên trên → cộng 90° để đầu bọ theo hướng di chuyển
        refs.current[i]?.style.setProperty('transform', `translate(${b.x}px,${b.y}px) rotate(${b.a + Math.PI / 2}rad)`)
      })
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(id)
  }, [count])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <Bug
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={`${BUG_COLORS[i % BUG_COLORS.length]} absolute top-0 left-0 size-10`}
          style={{ transform: 'translate(-100px,-100px)' }}
        />
      ))}
    </div>
  )
}

// Enter ở field giữa → nhảy xuống field kế; field cuối (OTP) để Enter submit form như mặc định
const focusOnEnter = (nextId: string) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
  e.preventDefault()
  document.getElementById(nextId)?.focus()
}

function IconLabel({ icon: Icon, children }: { icon: typeof User; children: string }) {
  return (
    <>
      <Icon className="text-muted-foreground size-4" aria-hidden />
      {children}
    </>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const session = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  useDocumentTitle(t('login.title'))

  if (session) return <Navigate to="/all" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(username.trim(), password, otp.trim())
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      if (code === 'otp_invalid') {
        setOtp('')
        document.getElementById('login-otp')?.focus()
      }
      setError(code === 'invalid_credentials' ? t('login.error') : errorMessage(err))
      setBusy(false)
      return
    }
    qc.clear() // bỏ cache của phiên trước
    navigate('/all', { replace: true })
  }

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <CrawlingBugs />
      <div className="absolute top-4 right-4">
        <LanguageSelect />
      </div>
      <div className="relative w-full max-w-md">
        <h1 className="flex items-center justify-center gap-3 text-5xl font-bold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg">
            <Bug className="size-7" aria-hidden />
          </span>
          DTS
        </h1>
        <div className="bg-card mt-6 rounded-xl border p-8 shadow-xs">
          <h2 className="text-xl font-semibold">{t('login.title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('login.desc')}</p>
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            {error && (
              <p role="alert" className="bg-destructive-bg text-destructive-text rounded-md px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Field id="login-username" label={<IconLabel icon={User}>{t('login.username')}</IconLabel>} required>
              {(c) => (
                <Input
                  {...c}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                  onKeyDown={focusOnEnter('login-password')}
                  autoComplete="username"
                  autoFocus
                />
              )}
            </Field>
            <Field id="login-password" label={<IconLabel icon={Lock}>{t('login.password')}</IconLabel>} required>
              {(c) => (
                <div className="relative">
                  <Input
                    {...c}
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    onKeyDown={focusOnEnter('login-otp')}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
                    aria-label={t(show ? 'login.hidePassword' : 'login.showPassword')}
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              )}
            </Field>
            <Field id="login-otp" label={<IconLabel icon={KeyRound}>{t('login.otp')}</IconLabel>} required>
              {(c) => (
                <Input
                  {...c}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''))
                    setError('')
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              )}
            </Field>
            <Button type="submit" disabled={busy || !username.trim() || !password || !otp.trim()} aria-busy={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('login.submit')}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
