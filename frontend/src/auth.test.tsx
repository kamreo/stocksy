import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthForm from './AuthForm.tsx'
import RequireAuth from './RequireAuth.tsx'

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('./auth-client.ts', () => ({
  authClient: {
    useSession: mocks.useSession,
    signIn: { email: mocks.signIn },
    signUp: { email: mocks.signUp },
  },
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<p>private page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.resetAllMocks())

describe('RequireAuth', () => {
  it('redirects to /login without a session', () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: false })
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows a loading state while the session loads', () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: true })
    renderAt('/')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the page with a session', () => {
    mocks.useSession.mockReturnValue({ data: { user: {} }, isPending: false })
    renderAt('/')
    expect(screen.getByText('private page')).toBeInTheDocument()
  })
})

describe('AuthForm', () => {
  beforeEach(() => mocks.useSession.mockReturnValue({ data: null, isPending: false }))

  it('shows the server error on a failed sign-in', async () => {
    mocks.signIn.mockResolvedValue({ error: { message: 'Invalid email or password' } })
    renderAt('/login')
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('shows inline errors and does not call the API for empty fields', async () => {
    renderAt('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.getByLabelText('Email')).toBeInvalid()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('requires at least 8 characters when registering', async () => {
    renderAt('/register')
    await userEvent.type(screen.getByLabelText('Name'), 'Ann')
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Use at least 8 characters.')
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('signs up with name, email and password, then leaves the form', async () => {
    mocks.signUp.mockResolvedValue({ error: null })
    mocks.useSession.mockReturnValue({ data: { user: {} }, isPending: false })
    renderAt('/register')
    await userEvent.type(screen.getByLabelText('Name'), 'Ann')
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    await waitFor(() =>
      expect(mocks.signUp).toHaveBeenCalledWith({
        name: 'Ann',
        email: 'a@example.com',
        password: 'password123',
      }),
    )
    expect(await screen.findByText('private page')).toBeInTheDocument()
  })
})
