import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Field from './Field.tsx'
import { ApiError, searchAssets, type Asset } from './portfolio-assets-api.ts'

export default function AssetSearch() {
  const navigate = useNavigate()
  const requestRef = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [inputError, setInputError] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || trimmed.length > 80) {
      setInputError('Enter between 1 and 80 characters.')
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setInputError(undefined)
    setError(null)
    setAssets(null)
    setBusy(true)
    try {
      const results = await searchAssets(trimmed, controller.signal)
      if (!controller.signal.aborted) setAssets(results)
    } catch (cause) {
      if (controller.signal.aborted) return
      if (cause instanceof ApiError && cause.status === 401) {
        setAssets(null)
        navigate('/login', { replace: true })
      } else
        setError('Could not search assets. Submit your search again to retry.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-semibold">Find supported assets</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Search the catalog by symbol or name.
      </p>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 flex flex-col items-start gap-3 sm:flex-row"
      >
        <div className="w-full sm:flex-1">
          <Field
            label="Asset search"
            name="assetQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            error={inputError}
          />
        </div>
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-800 sm:mt-6 dark:bg-emerald-500 dark:text-slate-950"
        >
          Search assets
        </button>
      </form>
      {busy && (
        <p role="status" className="mt-4">
          Searching assets…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {assets?.length === 0 && <p className="mt-4">No matching assets.</p>}
      {assets && assets.length > 0 && (
        <ul
          aria-label="Asset results"
          className="mt-4 divide-y divide-slate-200 dark:divide-slate-800"
        >
          {assets.map((asset) => (
            <li key={asset.id} className="py-3">
              <span className="font-medium">
                {asset.symbol} — {asset.name}
              </span>
              <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">
                {asset.assetType}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
