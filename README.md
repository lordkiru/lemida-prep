# Lemida Exam Prep

A phone-first practice app for SS2 and SS3 students preparing for WAEC and NECO. It is installable (a PWA) and works well
on a PC too. This repository is the **front end**; the API is `lemida-server` (the `/api/prep` routes).

> **Status: foundation only.** The shell, the design tokens, the theme switch, the PWA setup and the API connection are here.
> The five pages (Home, Practice, Mocks, Mistakes, Profile) say "Coming soon". There is no sign-in, no payment and no practice yet.

## What is in it

- **Responsive shell**: on a phone (under 1024px) a bottom tab bar with Home, Practice, Mocks, Mistakes and Profile; on a PC
  (1024px and up) a sidebar with the same five items.
- **Light and dark themes** that default to the device setting (Light / Dark / System switch, remembered in localStorage).
  The theme is applied before the first paint, so there is no flash.
- **Design tokens** in one file, `src/tokens.css`: colours for both themes, the Plus Jakarta Sans font and the glass-card style.
- **PWA**: web app manifest and a service worker that caches the **app shell only** (see below).
- **API client** (`src/api.js`) that reads the API address from `VITE_API_URL`.
- **Hidden debug page** at `/debug` (not in the menu) that calls `GET /api/prep/health` and shows **Connected** when the API answers.

## Run it locally

```bash
cp .env.example .env        # then check VITE_API_URL
npm install
npm run dev                 # http://localhost:5175
```

Start `lemida-server` too (`npm start` in its `server/` folder). It allows `http://localhost:5175` automatically whenever
`NODE_ENV` is not `production`. Then open <http://localhost:5175/debug>: it should say **Connected**.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5175 (SchoolManager is 5173, Content Studio 5174). |
| `npm run build` | Production build in `dist/`, including the service worker. |
| `npm run preview` | Serves the production build locally (the service worker only runs in a build). |
| `npm run lint` | ESLint. |
| `npm test` | Unit tests (theme, API client, PWA settings and repo rules). |
| `npm run icons` | Rebuilds the app icons in `public/icons/` from `public/logo.svg`. |

## Design tokens and themes

Everything visual comes from `src/tokens.css`:

| | Dark | Light |
| --- | --- | --- |
| Background | `#070D1F` | `#EEF3FB` |
| Text | `#F1F5FF` | `#0B1530` |
| Accent | mint `#5EEAD4` | teal `#0F766E` |
| Buttons | mint `#5EEAD4` | teal `#14B8A6` |
| Highlight (both) | amber `#FBBF24` | amber `#FBBF24` |

The glass card (`.glass`) is `rgba(255,255,255,0.07)` with a 1px `rgba(255,255,255,0.14)` border and `backdrop-filter: blur(18px)`.
On the light theme a white film is invisible on a pale page, so the card is a stronger white with a darker edge instead.
Button text is dark on the mint and teal buttons (white text would not be readable on the teal).

Use the tokens through Tailwind (`bg-bg`, `text-fg`, `text-muted`, `text-accent`, `bg-button`, `text-button-fg`, `bg-amber`) or the
classes `.glass`, `.btn-primary` and `.chip-amber`. Dark mode is the `dark` class on `<html>` (`dark:` variants work as in SchoolManager).

## The service worker: app shell only

`pwa.config.js` is the single place that decides what is cached, and `src/pwa.test.js` checks it:

- It **precaches the app shell**: the HTML, scripts, styles, icons and manifest produced by the build.
- It has **no runtime caching rules at all**. Every API call, and above all every response that carries questions or answers,
  goes straight to the network and is never stored by the service worker.
- API paths (`/api/...`) are excluded from the page-refresh fallback.
- The API also answers with `Cache-Control: no-store`, and `src/api.js` asks for `no-store` on every request.

Offline, the app opens (the shell is cached) but anything that needs the API says it cannot connect. Fonts come from Google Fonts and are
not cached, so offline the page falls back to the system font.

## Logo and icons

`public/logo.svg` is a **placeholder** "A+" medal, used in the sidebar, the top bar and as the app icon. To use the final logo:

1. Replace `public/logo.svg` with the new artwork (keep it inside its box, centred, with some room around the edge).
2. Run `npm run icons` to rebuild `public/icons/` (192, 512, maskable and Apple touch icons), and commit the result.

## Rules for this repo

- **Never commit question data.** Exam Prep reads questions from the API only. `.gitignore` blocks `question-data/` and `*.questions.json`.
- **Never commit secrets.** Configuration goes in `.env` (ignored); `.env.example` only has placeholders. The API address is not secret, but nothing else belongs here.
- **No exam-board logos, and no "official" or "past questions" wording** anywhere in the app. A test (`src/pwa.test.js`) scans the source for it.

## Deploy on Cloudflare Pages (free), at prep.lemidaitsolutions.com

Cloudflare Pages builds this straight from GitHub. Nothing below has been done yet: these are the steps to follow.

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and choose the `lordkiru/lemida-prep`
   repository. (Cloudflare asks you to grant its GitHub app access to the repository the first time.)
2. Build settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | None (or Vite) |
   | Root directory | *(leave empty: the app is at the top of this repo)* |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `VITE_API_URL` = `https://api.lemidaitsolutions.com` |

   If the build complains about the Node version, also add `NODE_VERSION` = `24`.
   `VITE_API_URL` is baked in at build time: change it, then redeploy.
3. `public/_redirects` (`/* /index.html 200`) is already in the repo, so refreshing any page works. `public/_headers` makes sure
   `sw.js`, `index.html` and the manifest are never served stale, while the hashed files under `/assets/` are cached for a year.
4. **Custom domain**: in the Pages project open **Custom domains → Set up a domain** and add `prep.lemidaitsolutions.com`.
   Because `lemidaitsolutions.com` is already in Cloudflare, it creates the DNS record for you.
5. Make sure the `tenant-router` Worker does not catch this address: Exam Prep must not be treated as a school subdomain
   (exclude `prep.lemidaitsolutions.com/*` from the Worker route). `prep` is also on the server's reserved-subdomain list, so no
   school can register it.
6. The API already allows `https://prep.lemidaitsolutions.com` (every `https://*.lemidaitsolutions.com` origin is allowed). A
   Cloudflare **preview** address (`https://<hash>.lemida-prep.pages.dev`) is not: if you want previews to reach the API, add that
   address to `ALLOWED_ORIGINS` on the server.
7. After the first deploy open `https://prep.lemidaitsolutions.com/debug`: it should say **Connected**. On a phone, open the site in
   Chrome or Safari and choose **Add to Home screen** / **Install app**.
