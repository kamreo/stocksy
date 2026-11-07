import { useEffect, useState } from 'react'
import { authClient } from './auth-client.ts'
import Logo from './Logo.tsx'

export default function Home() {
  const { data } = authClient.useSession()
  const [message, setMessage] = useState('...')

  useEffect(() => {
    fetch('/api')
      .then((res) => res.text())
      .then(setMessage)
      .catch(() => setMessage('backend unreachable'))
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-emerald-700 dark:text-emerald-400" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-400">
              {data?.user.email}
            </span>
            <button
              onClick={() => authClient.signOut()}
              className="h-10 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm font-medium transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 motion-reduce:transition-none dark:border-slate-700 dark:hover:bg-slate-800 dark:focus-visible:ring-emerald-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{data?.user.name ? `, ${data.user.name}` : ''}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Signed in as {data?.user.email}. Your portfolio will show up here.
        </p>
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400">Backend status</h2>
          <p className="mt-1 text-lg font-medium">{message}</p>
        </section>
      </main>
    </div>
  )
}
