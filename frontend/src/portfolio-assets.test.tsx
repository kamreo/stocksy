import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import AssetSearch from './AssetSearch.tsx'

const mocks = vi.hoisted(() => ({ useSession: vi.fn(), fetch: vi.fn() }))

vi.mock('./auth-client.ts', () => ({
  authClient: { useSession: mocks.useSession },
}))

const portfolio = {
  id: 'd5f8414d-02aa-4b5b-a0d5-65cab2391713',
  name: 'Savings',
  baseCurrency: 'USD',
  createdAt: '2026-11-09T18:00:00.000Z',
  updatedAt: '2026-11-09T18:00:00.000Z',
}
const bitcoin = {
  id: 'crypto:bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  assetType: 'CRYPTO',
}
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

function renderFeature(path = '/portfolios') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function renderSearch() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<AssetSearch />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useSession.mockReturnValue({
    data: { user: { name: 'Test', email: 'test@example.com' } },
    isPending: false,
  })
  mocks.fetch.mockResolvedValue(response([]))
  vi.stubGlobal('fetch', mocks.fetch)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Portfolio screens', () => {
  it.each(['/portfolios', `/portfolios/${portfolio.id}`])(
    'protects %s without a session',
    (path) => {
      mocks.useSession.mockReturnValue({ data: null, isPending: false })
      renderFeature(path)
      expect(
        screen.getByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument()
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )

  it('shows loading followed by the empty portfolio state', async () => {
    renderFeature()
    expect(screen.getByRole('status')).toHaveTextContent('Loading portfolios')
    expect(await screen.findByText(/No portfolios yet/)).toBeInTheDocument()
    expect(screen.getByLabelText('Base currency')).toHaveValue('USD')
  })

  it('retries a failed list request', async () => {
    mocks.fetch
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([]))
    renderFeature()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load portfolios',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry portfolios' }),
    )
    expect(await screen.findByText(/No portfolios yet/)).toBeInTheDocument()
  })

  it('opens a selected portfolio and renders its persisted metadata', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response([portfolio]))
      .mockResolvedValueOnce(response(portfolio))
    renderFeature()
    await userEvent.click(await screen.findByRole('link', { name: 'Savings' }))
    expect(await screen.findByText('Savings')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Portfolio details' }),
    ).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(document.querySelector('time')).toHaveAttribute(
      'datetime',
      portfolio.createdAt,
    )
  })

  it.each(['   ', 'a'.repeat(81)])(
    'validates name before creating a portfolio (%s)',
    async (name) => {
      renderFeature()
      await screen.findByText(/No portfolios yet/)
      await userEvent.type(screen.getByLabelText('Portfolio name'), name)
      await userEvent.click(
        screen.getByRole('button', { name: 'Create portfolio' }),
      )
      expect(screen.getByLabelText('Portfolio name')).toBeInvalid()
      expect(mocks.fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('creates with the selected currency, prevents duplicate submits and opens detail', async () => {
    let finish!: (value: ReturnType<typeof response>) => void
    mocks.fetch.mockImplementation((_path: string, options?: RequestInit) =>
      options?.method === 'POST'
        ? new Promise((resolve) => {
            finish = resolve
          })
        : Promise.resolve(
            response(
              _path === '/api/portfolios'
                ? []
                : { ...portfolio, baseCurrency: 'EUR' },
            ),
          ),
    )
    renderFeature()
    await screen.findByText(/No portfolios yet/)
    await userEvent.type(screen.getByLabelText('Portfolio name'), '  Savings  ')
    await userEvent.selectOptions(screen.getByLabelText('Base currency'), 'EUR')
    await userEvent.click(
      screen.getByRole('button', { name: 'Create portfolio' }),
    )
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    expect(mocks.fetch).toHaveBeenLastCalledWith(
      '/api/portfolios',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ name: 'Savings', baseCurrency: 'EUR' }),
      }),
    )
    await act(async () =>
      finish(response({ ...portfolio, baseCurrency: 'EUR' }, 201)),
    )
    expect(await screen.findByText('Savings')).toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
  })

  it('preserves form values after a server error', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ message: 'Try later.' }, 500))
    renderFeature()
    await screen.findByText(/No portfolios yet/)
    await userEvent.type(screen.getByLabelText('Portfolio name'), 'Savings')
    await userEvent.click(
      screen.getByRole('button', { name: 'Create portfolio' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Try later.')
    expect(screen.getByLabelText('Portfolio name')).toHaveValue('Savings')
    expect(
      screen.getByRole('button', { name: 'Create portfolio' }),
    ).toBeEnabled()
  })

  it.each(['/portfolios', `/portfolios/${portfolio.id}`])(
    'redirects expired sessions from %s',
    async (path) => {
      mocks.fetch.mockResolvedValue(response({ message: 'Unauthorized' }, 401))
      renderFeature(path)
      expect(
        await screen.findByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Savings')).not.toBeInTheDocument()
    },
  )

  it('redirects when a session expires during creation', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({}, 401))
    renderFeature()
    await screen.findByText(/No portfolios yet/)
    await userEvent.type(screen.getByLabelText('Portfolio name'), 'Savings')
    await userEvent.click(
      screen.getByRole('button', { name: 'Create portfolio' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('shows a detail loading state and can retry a failed request', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response({}, 500))
      .mockResolvedValueOnce(response(portfolio))
    renderFeature(`/portfolios/${portfolio.id}`)
    expect(screen.getByRole('status')).toHaveTextContent('Loading portfolio')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load portfolio',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry portfolio' }),
    )
    expect(await screen.findByText('Savings')).toBeInTheDocument()
  })

  it('shows an inaccessible detail as not found', async () => {
    mocks.fetch.mockResolvedValue(response({}, 404))
    renderFeature(`/portfolios/${portfolio.id}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Portfolio not found.',
    )
    expect(
      screen.queryByRole('button', { name: 'Retry portfolio' }),
    ).not.toBeInTheDocument()
  })
})

describe('AssetSearch', () => {
  it('validates a blank query without an API call', async () => {
    renderSearch()
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(screen.getByLabelText('Asset search')).toBeInvalid()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('submits a trimmed query and displays metadata', async () => {
    mocks.fetch.mockResolvedValue(response([bitcoin]))
    renderSearch()
    await userEvent.type(screen.getByLabelText('Asset search'), ' BTC ')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(await screen.findByText('BTC — Bitcoin')).toBeInTheDocument()
    expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/assets/search?q=BTC',
      expect.objectContaining({
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('shows no matches', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText('Asset search'), 'unmatched')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(await screen.findByText('No matching assets.')).toBeInTheDocument()
  })

  it('retries a failed search by submitting again', async () => {
    mocks.fetch
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([bitcoin]))
    renderSearch()
    await userEvent.type(screen.getByLabelText('Asset search'), 'BTC')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not search assets',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(await screen.findByText('BTC — Bitcoin')).toBeInTheDocument()
  })

  it('discards an obsolete request and aborts on unmount', async () => {
    let finishFirst!: (value: ReturnType<typeof response>) => void
    mocks.fetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve
          }),
      )
      .mockResolvedValueOnce(response([]))
    const view = renderSearch()
    await userEvent.type(screen.getByLabelText('Asset search'), 'BTC')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(screen.getByRole('status')).toHaveTextContent('Searching assets')
    const firstSignal = mocks.fetch.mock.calls[0][1].signal as AbortSignal
    await userEvent.clear(screen.getByLabelText('Asset search'))
    await userEvent.type(screen.getByLabelText('Asset search'), 'unmatched')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(await screen.findByText('No matching assets.')).toBeInTheDocument()
    expect(firstSignal.aborted).toBe(true)
    await act(async () => finishFirst(response([bitcoin])))
    expect(screen.queryByText('BTC — Bitcoin')).not.toBeInTheDocument()
    const lastSignal = mocks.fetch.mock.calls[1][1].signal as AbortSignal
    view.unmount()
    expect(lastSignal.aborted).toBe(true)
  })

  it('redirects on session expiry instead of showing search data', async () => {
    mocks.fetch.mockResolvedValue(response({}, 401))
    renderSearch()
    await userEvent.type(screen.getByLabelText('Asset search'), 'BTC')
    await userEvent.click(screen.getByRole('button', { name: 'Search assets' }))
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument()
  })
})
