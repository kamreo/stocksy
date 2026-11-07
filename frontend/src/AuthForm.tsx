import { useRef, useState, type FocusEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from './AuthLayout.tsx'
import { authClient } from './auth-client.ts'
import Field from './Field.tsx'

type Mode = 'login' | 'register'
type Errors = Partial<Record<'name' | 'email' | 'password', string>>

function validate(field: string, value: string, mode: Mode): string | undefined {
  if (field === 'name' && !value.trim()) return 'Enter your name.'
  if (field === 'email' && !/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email address.'
  if (field === 'password') {
    if (!value) return 'Enter your password.'
    if (mode === 'register' && value.length < 8) return 'Use at least 8 characters.'
  }
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'
  const fields = isRegister ? ['name', 'email', 'password'] : ['email', 'password']

  function onBlur(e: FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setErrors((prev) => ({ ...prev, [name]: validate(name, value, mode) }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const next: Errors = {}
    for (const f of fields) next[f as keyof Errors] = validate(f, String(form.get(f) ?? ''), mode)
    setErrors(next)
    const firstInvalid = fields.find((f) => next[f as keyof Errors])
    if (firstInvalid) {
      ;(formRef.current?.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus()
      return
    }

    const email = String(form.get('email'))
    const password = String(form.get('password'))
    setBusy(true)
    setServerError(null)
    const { error } = isRegister
      ? await authClient.signUp.email({ name: String(form.get('name')), email, password })
      : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (error) setServerError(error.message ?? 'Something went wrong. Try again.')
    else navigate('/', { replace: true })
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">
        {isRegister ? 'Create account' : 'Sign in'}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        {isRegister ? 'Start tracking your portfolio.' : 'Welcome back to Stocksy.'}
      </p>

      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {isRegister && (
          <Field label="Name" name="name" autoComplete="name" onBlur={onBlur} error={errors.name} />
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" onBlur={onBlur} error={errors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          onBlur={onBlur}
          error={errors.password}
          hint={isRegister ? 'At least 8 characters.' : undefined}
        />

        {serverError && (
          <p role="alert" className="rounded-lg border border-red-600/30 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 font-medium text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-950"
        >
          {busy && <Spinner />}
          {isRegister ? 'Sign up' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
        <Link
          to={isRegister ? '/login' : '/register'}
          className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-emerald-400"
        >
          {isRegister ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
    </AuthLayout>
  )
}
