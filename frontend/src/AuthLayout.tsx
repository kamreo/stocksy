import type { ReactNode } from 'react'
import Logo from './Logo.tsx'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <Logo className="text-emerald-400" />
        <div>
          <p className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
            Stocks and crypto, in one portfolio.
          </p>
          <p className="mt-4 max-w-sm text-slate-300">
            Record your trades, see what you hold and how it performs, and review every change.
          </p>
        </div>
        <svg viewBox="0 0 400 120" className="h-24 w-full text-emerald-500/70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M0 100 L50 80 L90 90 L140 50 L190 62 L240 30 L290 44 L340 14 L400 24" />
        </svg>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 text-emerald-700 lg:hidden dark:text-emerald-400" />
          {children}
        </div>
      </main>
    </div>
  )
}
