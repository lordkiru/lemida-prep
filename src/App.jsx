import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ComingSoon from './pages/ComingSoon'
import Debug from './pages/Debug'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ComingSoon title="Home" />} />
        <Route path="practice" element={<ComingSoon title="Practice" />} />
        <Route path="mocks" element={<ComingSoon title="Mocks" />} />
        <Route path="mistakes" element={<ComingSoon title="Mistakes" />} />
        <Route path="profile" element={<ComingSoon title="Profile" />} />
        {/* hidden: not in the menu */}
        <Route path="debug" element={<Debug />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
