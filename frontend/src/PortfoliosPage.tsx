import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AssetSearch from './AssetSearch.tsx'
import Field from './Field.tsx'
import {
  ApiError,
  createPortfolio,
  listPortfolios,
  type BaseCurrency,
  type Portfolio,
} from './portfolio-assets-api.ts'

export default function PortfoliosPage() {
  const navigate = useNavigate()
  const [portfolios, setPortfolios] = useState<Portfolio[] | null>(null)
  const [listError, setListError] = useState(false)
  const [reload, setReload] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<BaseCurrency>('USD')
  const [nameError, setNameError] = useState<string>()
  const [createError, setCreateError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listPortfolios(controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) setPortfolios(results)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 401) {
          setPortfolios(null)
          navigate('/login', { replace: true })
        } else setListError(true)
      })
    return () => controller.abort()
  }, [navigate, reload])

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 80) {
      setNameError('Enter between 1 and 80 characters.')
      return
    }
    setNameError(undefined)
    setCreateError(null)
    setBusy(true)
    try {
      const portfolio = await createPortfolio({
        name: trimmed,
        baseCurrency: currency,
      })
      navigate(`/portfolios/${portfolio.id}`)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setPortfolios(null)
        navigate('/login', { replace: true })
      } else
        setCreateError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not create portfolio. Try again.',
        )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/" className="text-emerald-700 underline dark:text-emerald-400">
        Back to home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Portfolios</h1>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Create portfolio</h2>
        <form onSubmit={onCreate} noValidate className="mt-4 space-y-4">
          <Field
            label="Portfolio name"
            name="portfolioName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={nameError}
          />
          <div>
            <label
              htmlFor="baseCurrency"
              className="mb-1.5 block text-sm font-medium"
            >
              Base currency
            </label>
            <select
              id="baseCurrency"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as BaseCurrency)
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            >
              {(['USD', 'EUR', 'PLN'] as const).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          {createError && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {createError}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-11 cursor-pointer rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:text-slate-950"
          >
            {busy ? 'Creating…' : 'Create portfolio'}
          </button>
        </form>
      </section>
      <section className="mt-8" aria-labelledby="your-portfolios">
        <h2 id="your-portfolios" className="text-xl font-semibold">
          Your portfolios
        </h2>
        {!portfolios && !listError && (
          <p role="status" className="mt-4">
            Loading portfolios…
          </p>
        )}
        {listError && (
          <div className="mt-4">
            <p role="alert">Could not load portfolios.</p>
            <button
              onClick={() => {
                setPortfolios(null)
                setListError(false)
                setReload((value) => value + 1)
              }}
              className="mt-2 cursor-pointer text-emerald-700 underline dark:text-emerald-400"
            >
              Retry portfolios
            </button>
          </div>
        )}
        {portfolios?.length === 0 && (
          <p className="mt-4">
            No portfolios yet. Create your first portfolio above.
          </p>
        )}
        {portfolios && portfolios.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {portfolios.map((portfolio) => (
              <li key={portfolio.id} className="py-3">
                <Link
                  to={`/portfolios/${portfolio.id}`}
                  className="font-medium text-emerald-700 underline dark:text-emerald-400"
                >
                  {portfolio.name}
                </Link>
                <span className="ml-3 text-slate-600 dark:text-slate-400">
                  {portfolio.baseCurrency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AssetSearch />
    </main>
  )
}
