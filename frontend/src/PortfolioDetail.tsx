import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ApiError,
  getPortfolio,
  type Portfolio,
} from './portfolio-assets-api.ts'

export default function PortfolioDetail() {
  const { id } = useParams()
  return <PortfolioDetailContent key={id} id={id ?? ''} />
}

function PortfolioDetailContent({ id }: { id: string }) {
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    if (!id) return () => controller.abort()
    getPortfolio(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPortfolio(result)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 401) {
          setPortfolio(null)
          navigate('/login', { replace: true })
        } else if (cause instanceof ApiError && cause.status === 404) {
          setNotFound(true)
          setError('Portfolio not found.')
        } else setError('Could not load portfolio.')
      })
    return () => controller.abort()
  }, [id, navigate, reload])

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        to="/portfolios"
        className="text-emerald-700 underline dark:text-emerald-400"
      >
        Back to portfolios
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Portfolio details
      </h1>
      {!portfolio && !error && (
        <p role="status" className="mt-4">
          Loading portfolio…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      {error && !notFound && (
        <button
          onClick={() => {
            setPortfolio(null)
            setError(null)
            setNotFound(false)
            setReload((value) => value + 1)
          }}
          className="mt-2 cursor-pointer text-emerald-700 underline dark:text-emerald-400"
        >
          Retry portfolio
        </button>
      )}
      {portfolio && (
        <dl className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-400">Name</dt>
            <dd className="font-medium">{portfolio.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-400">
              Base currency
            </dt>
            <dd>{portfolio.baseCurrency}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-400">
              Created
            </dt>
            <dd>
              <time dateTime={portfolio.createdAt}>
                {new Date(portfolio.createdAt).toLocaleString()}
              </time>
            </dd>
          </div>
        </dl>
      )}
    </main>
  )
}
