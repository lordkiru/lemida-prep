import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'
import { landingFor, safeNext } from './rules'
import Notice from '../components/Notice'

function Waiting({ children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      <div role="status" className="glass w-full p-6 text-center">
        {children}
      </div>
    </div>
  )
}

// The app proper. Signed-out visitors go to the sign-in page (and come back to this page afterwards). Someone who has not done the
// first-time setup is sent there first, unless this route IS the setup (needSetup={false}).
export function RequireAuth({ needSetup = true }) {
  const { status, user, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Waiting>Loading...</Waiting>
  if (status === 'error') {
    return (
      <Waiting>
        <Notice kind="error">{error}</Notice>
        <button type="button" onClick={retry} className="btn-primary mt-4">
          Try again
        </button>
      </Waiting>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (needSetup && !user.profileComplete) return <Navigate to="/setup" replace />
  return <Outlet />
}

// Sign-in, sign-up and forgot-password are for people who are NOT signed in: a signed-in student is sent on to where they belong.
export function GuestOnly() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Waiting>Loading...</Waiting>
  if (user) return <Navigate to={safeNext(location.state?.from) || landingFor(user)} replace />
  // (when the server cannot be reached the forms still show: signing in will then say so itself)
  return <Outlet />
}
