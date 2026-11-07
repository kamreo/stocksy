import { Navigate, Outlet } from 'react-router'
import { authClient } from './auth-client.ts'

export default function RequireAuth() {
  const { data, isPending } = authClient.useSession()
  if (isPending) {
    return (
      <p role="status" className="grid min-h-dvh place-items-center text-slate-600 dark:text-slate-400">
        Loading…
      </p>
    )
  }
  if (!data) return <Navigate to="/login" replace />
  return <Outlet />
}
