import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/guards'
import AppShell from './components/AppShell'
import AuthLayout from './components/AuthLayout'
import Admin from './pages/Admin'
import Debug from './pages/Debug'
import Marketer from './pages/marketer/Marketer'
import MarketerSignup from './pages/marketer/Signup'
import { MarketerForgot, MarketerSetPassword } from './pages/marketer/Password'
import Home from './pages/Home'
import MockExam from './pages/MockExam'
import MockResult from './pages/MockResult'
import Mocks from './pages/Mocks'
import Mistakes from './pages/Mistakes'
import { Privacy, Terms } from './pages/Legal'
import Plans from './pages/Plans'
import Practice from './pages/Practice'
import PracticeSession from './pages/PracticeSession'
import PracticeSummary from './pages/PracticeSummary'
import Profile from './pages/Profile'
import Setup from './pages/Setup'
import Forgot from './pages/auth/Forgot'
import Login from './pages/auth/Login'
import Reset from './pages/auth/Reset'
import Signup from './pages/auth/Signup'
import Verify from './pages/auth/Verify'

//   /login /signup /forgot   only for people who are signed out
//   /verify /reset           the pages the emailed links open (anyone, signed in or not)
//   /setup                   first-time setup, also reachable later from Profile (signed in)
//   everything else          the app, for signed-in students who finished the setup
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot" element={<Forgot />} />
          </Route>
          <Route path="verify" element={<Verify />} />
          <Route path="reset" element={<Reset />} />
          {/* hidden: not in the menu */}
          <Route path="debug" element={<Debug />} />
        </Route>

        {/* the admin page: its own page with its own super-admin sign-in, not part of the student app (and not in the menu) */}
        <Route path="admin" element={<Admin />} />

        {/* the marketer's own pages: their own sign-in, not part of the student app (and not in its menu) */}
        <Route path="marketer" element={<Marketer />} />
        <Route path="marketer/signup" element={<MarketerSignup />} />
        <Route path="marketer/set-password" element={<MarketerSetPassword />} />
        <Route path="marketer/forgot" element={<MarketerForgot />} />

        {/* public, signed in or not */}
        <Route element={<AuthLayout wide />}>
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
        </Route>

        <Route element={<RequireAuth needSetup={false} />}>
          <Route element={<AuthLayout wide />}>
            <Route path="setup" element={<Setup />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="practice" element={<Practice />} />
            <Route path="practice/session/:sessionId" element={<PracticeSession />} />
            <Route path="practice/session/:sessionId/summary" element={<PracticeSummary />} />
            <Route path="mocks" element={<Mocks />} />
            <Route path="mocks/:mockId" element={<MockExam />} />
            <Route path="mocks/:mockId/result" element={<MockResult />} />
            <Route path="mistakes" element={<Mistakes />} />
            <Route path="plans" element={<Plans />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
