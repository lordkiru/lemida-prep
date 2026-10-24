import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { captureReferralFromUrl } from './referral'

// a link with ?ref=CODE remembers the code before anything redirects (a signed-out visitor is sent on to /login, which would lose the query string)
captureReferralFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
