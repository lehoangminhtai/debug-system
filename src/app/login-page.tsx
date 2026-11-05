import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useI18n } from '@/i18n'
import { login, useSession } from '@/services/auth'

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const session = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  useDocumentTitle(t('login.title'))

  if (session) return <Navigate to="/all" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await new Promise((r) => setTimeout(r, 300)) // mô phỏng độ trễ mạng
    if (!login(username, password)) {
      setError(true)
      setBusy(false)
      return
    }
    navigate('/all', { replace: true })
  }

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-5xl font-bold tracking-tight">DTS</h1>
        <div className="bg-card mt-6 rounded-xl border p-6 shadow-xs">
          <h2 className="text-lg font-semibold">{t('login.title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('login.desc')}</p>
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            {error && (
              <p role="alert" className="bg-destructive-bg text-destructive-text rounded-md px-3 py-2 text-sm">
                {t('login.error')}
              </p>
            )}
            <Field id="login-username" label={t('login.username')} required>
              {(c) => (
                <Input
                  {...c}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError(false)
                  }}
                  autoComplete="username"
                  autoFocus
                />
              )}
            </Field>
            <Field id="login-password" label={t('login.password')} required>
              {(c) => (
                <div className="relative">
                  <Input
                    {...c}
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(false)
                    }}
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
            <Button type="submit" disabled={busy || !username.trim() || !password} aria-busy={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('login.submit')}
            </Button>
          </form>
        </div>
        <p className="text-muted-foreground mt-4 text-center text-xs">{t('login.hint')}</p>
      </div>
    </main>
  )
}
