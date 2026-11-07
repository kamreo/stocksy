import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export default function Field({ label, error, hint, id, ...input }: Props) {
  const fieldId = id ?? input.name
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const described = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 shadow-sm transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-50 motion-reduce:transition-none dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-offset-slate-950 ${
          error
            ? 'border-red-600 focus:ring-red-600 dark:border-red-400 dark:focus:ring-red-400'
            : 'border-slate-300 focus:border-emerald-700 focus:ring-emerald-700 dark:border-slate-700 dark:focus:border-emerald-400 dark:focus:ring-emerald-400'
        }`}
        {...input}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
