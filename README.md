# Lemida Exam Prep

A phone-first practice app for SS2 and SS3 students preparing for WAEC and NECO. It is installable (a PWA) and works well
on a PC too. This repository is the **front end**; the API is `lemida-server` (the `/api/prep` routes).

> **Status: foundation + accounts + practice.** The shell, the design tokens, the theme switch, the PWA setup, the API connection and now
> **sign-up, sign-in, email confirmation, password reset and the first-time setup** are here. Home, Practice and Profile are real;
> Mocks and Mistakes still say "Coming soon". There is no payment yet.

## What is in it

- **Responsive shell**: on a phone (under 1024px) a bottom tab bar with Home, Practice, Mocks, Mistakes and Profile; on a PC
  (1024px and up) a sidebar with the same five items.
- **Light and dark themes** that default to the device setting (Light / Dark / System switch, remembered in localStorage).
  The theme is applied before the first paint, so there is no flash.
- **Design tokens** in one file, `src/tokens.css`: colours for both themes, the Plus Jakarta Sans font and the glass-card style.
- **PWA**: web app manifest and a service worker that caches the **app shell only** (see below).
- **API client** (`src/api.js`) that reads the API address from `VITE_API_URL`.
- **Accounts** (see "Accounts and sign-in" below): sign up, confirm your email, sign in, forgot password, first-time setup, sign out.
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
| `npm test` | Unit tests (theme, API client, sign-in rules, PWA settings and repo rules). |
| `npm run icons` | Rebuilds the app icons in `public/icons/` from `public/logo.svg`. |

## Accounts and sign-in

| Page | What it does |
| --- | --- |
| `/signup` | name, email, password; then "Check your email" with a Resend button (60 s wait between sends) |
| `/verify?token=` | the link in the confirmation email: confirms the email **and signs the student in** |
| `/login` | sign in; if the email is not confirmed yet it offers to resend the link |
| `/forgot`, `/reset?token=` | forgotten password: emailed link (60 minutes), choose a new password; signs the account out everywhere |
| `/setup` | first-time setup: exam (WAEC / NECO / both), class (SS2 / SS3), exam year, subjects. Also "Change my setup" on Profile |
| `/profile` | the details, and Sign out |

How it behaves:

- **The session is a cookie that only the server can read** (`prep_session`, httpOnly, Secure, SameSite=Lax, 30 days). Nothing about the
  sign-in is kept in localStorage or sessionStorage; `src/api.js` sends `credentials: 'include'` so the browser attaches the cookie.
  On load, `AuthProvider` asks `GET /api/prep/me` who is signed in.
- **Guards** (`src/auth/guards.jsx`): signed-out visitors are sent to `/login` (and back to the page they wanted afterwards, only ever a page
  inside this app); a signed-in student who has not done the setup is sent to `/setup`; `/login`, `/signup` and `/forgot` send a signed-in student on.
- **One sign-in per account**: signing in on a new device ends the session on every other device. The older device finds out on its next request
  (or when the student comes back to the app) and shows the sign-in page with the reason; `api.onSessionEnded` carries that news from any request.
- **Emailed links** carry a one-time token. The page reads it once and removes it from the address bar, and `index.html` sets
  `<meta name="referrer" content="no-referrer">`, so the token is not left in history or passed to other sites.
- **No account discovery**: sign-up, resend and forgot-password say the same thing whether or not the email has an account, and a wrong email
  and a wrong password give the same "Incorrect email or password."
- The checks in the forms (`src/auth/rules.js`) are only for quick feedback; the server repeats and enforces every rule.
- Forms use real labels, `autocomplete` values (so password managers work), 16px text (no zoom on iPhones), errors tied to their fields
  with `aria-describedby`, and choices that show a tick as well as a colour.

To try it locally you need `lemida-server` running with `PREP_JWT_SECRET` set (different from `JWT_SECRET`). Without an `EMAIL_USER`/`EMAIL_PASS`
the server prints each email, link included, to its own log when `NODE_ENV` is not `production`: copy the link from there.

## Practice

`/practice` lists the student's own subjects (from their setup) with how many questions are ready and how many they have seen. A round is up to
10 questions at `/practice/session/:id`: tap an answer (or press A to D), see at once whether it was right and why, then Next. The end of the round
(`.../summary`) shows the score and every missed question with the right answer and the explanation.

- **The answer key never reaches the browser early.** A question arrives without its answer or explanation; the server checks each choice and
  returns the right answer and explanation only after that question is answered (`src/api.js` `practice.answer`). The first answer to a question stands.
- A half-finished round can be carried on after a refresh or on another visit (`Continue`), or thrown away (`Start a new round`).
- New questions come first, then the ones the student missed, then the ones answered right longest ago. When every question in a subject has been
  seen, the card says so and the round is revision.
- A subject with no approved questions shows "Coming soon" and cannot be started.
- Keyboard: A to D or 1 to 4 choose an answer; focus moves to "Next question" after answering. Right and wrong are shown in words ("Correct answer",
  "Your answer") as well as colour.

## Security headers, privacy and data

- **Security headers** (`scripts/make-headers.mjs`, run by `npm run build`) write `dist/_headers`: a content security policy (only this site's own
  files, the API in `VITE_API_URL`, Google Fonts and one fingerprinted inline script, the theme script that stops the light/dark flash),
  no framing of the site (`frame-ancestors 'none'`, `X-Frame-Options`), HSTS, a permissions policy and a cross-origin opener policy. Cloudflare Pages
  applies the file to every page. The fingerprint is recalculated at every build, so editing the inline script in `index.html` needs no manual step.
  `src/headers.test.js` covers the generator, and the browser journeys were run against the finished build with these headers applied.
- **`/privacy` and `/terms`** are public pages in plain language (`src/pages/Legal.jsx`), linked from sign-up, every sign-in page and Profile. If the app
  starts to collect or share something new (analytics, payments, advertising), update that text first. They are a plain-language draft: have a
  lawyer check them before the app is promoted widely.
- **Delete my account** (Profile) asks for the password again and deletes the account, its practice rounds and its progress for good
  (`DELETE /api/prep/me`). An account that never confirms its email is deleted automatically after 7 days (a database rule on the server).
- **`public/robots.txt`** keeps search engines out of the app and the one-time email links.

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

The logo is the green 3D "A+" medal, in two files that are kept exactly as designed:

| File | What it is | Used for |
| --- | --- | --- |
| `public/logo.svg` | the medal on its navy tile | **dark mode** screens, the SVG favicon, and all the app icons |
| `public/logo-no-tile.svg` | the same medal with no tile | **light mode** screens |

- `src/components/Logo.jsx` shows one or the other with the theme, and `Brand.jsx` adds the name beside it ("Lemida" small above "Exam Prep" in bold).
  Both are shown as `<img>`, never pasted inline as `<svg>`: the two files use the same gradient ids, so two inline copies on one page would clash.
- `npm run icons` rebuilds `public/icons/` from them: `favicon-32.png`, `icon-192.png` and `icon-512.png` (the tile), `maskable-512.png`
  (a full square of navy `#0A1330` with the medal kept inside the central 80% safe zone, so Android can crop it to any shape) and
  `apple-touch-icon.png` (180 x 180, solid navy behind the tile, no transparency). Run it again whenever a logo file changes, and commit the result.
- `src/logo.test.js` checks all of this, including that nothing but navy lies outside the maskable icon's safe zone.

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
