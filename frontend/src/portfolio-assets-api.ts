export type BaseCurrency = 'USD' | 'EUR' | 'PLN'

export interface Portfolio {
  id: string
  name: string
  baseCurrency: BaseCurrency
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: string
  symbol: string
  name: string
  assetType: 'CRYPTO'
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      typeof body?.message === 'string'
        ? body.message
        : 'Request failed. Try again.',
    )
  }
  return response.json() as Promise<T>
}

export function listPortfolios(signal: AbortSignal) {
  return apiRequest<Portfolio[]>('/api/portfolios', { signal })
}

export function createPortfolio(input: {
  name: string
  baseCurrency: BaseCurrency
}) {
  return apiRequest<Portfolio>('/api/portfolios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function getPortfolio(id: string, signal: AbortSignal) {
  return apiRequest<Portfolio>(`/api/portfolios/${encodeURIComponent(id)}`, {
    signal,
  })
}

export function searchAssets(query: string, signal: AbortSignal) {
  return apiRequest<Asset[]>(
    `/api/assets/search?q=${encodeURIComponent(query)}`,
    { signal },
  )
}
