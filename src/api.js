// Talks to the Lemida backend (lemida-server). The address comes from VITE_API_URL (see .env.example); there is no default, so
// a build that forgot to set it says so plainly instead of calling the wrong server.
//
// Questions and answers must never be stored on the device by accident, so every request asks the browser for `no-store`
// and the service worker has no rule that touches API calls (see pwa.config.js). The API answers with Cache-Control: no-store too.
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

export const normaliseBaseUrl = (value) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '')

// `baseUrl` and `fetchImpl` are parameters so this can be tested without a browser or a server.
export function createApi({ baseUrl, fetchImpl } = {}) {
  const base = normaliseBaseUrl(baseUrl)
  const doFetch = fetchImpl || ((...args) => fetch(...args))

  async function request(path, options = {}) {
    if (!base) throw new ApiError('VITE_API_URL is not set. Copy .env.example to .env and set it, then restart.')

    let res
    try {
      res = await doFetch(`${base}${path}`, {
        ...options,
        cache: 'no-store',
        headers: { Accept: 'application/json', ...options.headers },
      })
    } catch {
      throw new ApiError('Cannot reach the server. Check your internet connection and try again.')
    }

    let data = null
    try {
      data = await res.json()
    } catch {
      // an empty or non-JSON body
    }
    if (!res.ok) throw new ApiError((data && data.error) || `Something went wrong (${res.status})`, res.status)
    return data
  }

  // GET /api/prep/health: resolves true when the Prep API says { ok: true }
  const health = async () => {
    const data = await request('/api/prep/health')
    return Boolean(data && data.ok === true)
  }

  return { baseUrl: base, request, health }
}

export const api = createApi({ baseUrl: import.meta.env?.VITE_API_URL })
