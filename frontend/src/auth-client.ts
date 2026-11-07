import { createAuthClient } from 'better-auth/react'

// No baseURL: the browser talks to the same origin and /api is proxied to the backend.
export const authClient = createAuthClient()
