# Acme Workspace (demo)

An admin dashboard for a fictional short-term-rental management company, built with **Next.js 16 (App Router)**, **React 18** and **TypeScript**. It covers portfolio analytics, bookings, finance, AI-assisted guest communication and a cleaning-operations app for field staff.

> Everything in this repository is **placeholder content**: brand, people, properties, prices and photos are fictional. There is **no backend and no authentication**. The app is always "signed in" as a demo admin, and every API request is answered by a mock API from `lib/dummy.js`.

## Screens
- **Home**: multi-currency KPI cards, AI alerts, daily check-ins/outs, guest demographics, channel mix, top performers and live cleaning feed
- **AI Insight**: operations overview, live priorities, chronic issues, financial risks, live team status and automation override
- **Conversations**: guest inbox with messages and AI analysis
- **Stats** and **Finance**: revenue, expenses, NOI, occupancy, ADR and revenue pacing in USD / EUR / TRY, plus expense and profitability breakdowns
- **Properties**, **Bookings**, **Users**, **Forms**
- **Cleaning App**: overview, monthly/weekly schedule and a **Quality** review screen (filled-in checklist answers and a cleaner ↔ admin chat)
- **Settings**: owner-view permissions and payment-split rules

## Tech stack
Next.js, TypeScript, SCSS Modules, MUI, Radix UI, Recharts, Apex-style charting tokens, React Icons, FullCalendar-style scheduling UI

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000  (redirects to /dashboard)
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |

## How the mock data works
- `app/api/proxy/[...path]/route.ts` is a mock REST API. The typed service layer in `lib/services/*` is unchanged and talks to it exactly as it would talk to a real backend.
- `lib/dummy.js` holds the fictional data: 12 properties, ~225 reservations, tasks, expenses, conversations, forms and more. Dates are generated **relative to today** (about three months back, one month ahead), so charts always look current.
- `lib/mock-engine.ts` implements filtering, ordering, pagination and the analytics aggregation (occupancy, ADR, earnings and expenses per currency).
- The data is kept in memory and resets when the server restarts.
- `lib/dummy.js` is shared verbatim with the *Acme Owners Panel* demo so both show the same numbers.

## Design tokens
Colors are defined once as CSS variables in `styles/globals.scss` (navy and gold primary/secondary scales, neutrals, semantic colors, categorical and financial chart colors). Charts reference tokens such as `var(--chart-1)` or `var(--revenue-try)`.

## Project structure
```
app/                 routes, layouts and the mock API (app/api/proxy)
components/          UI building blocks
context/             React contexts (workspace, theme, demo auth)
lib/                 services, mock data (dummy.js) and mock engine
styles/              SCSS modules and global tokens
types/               shared TypeScript types
```

## License
Apache-2.0, see [LICENSE](LICENSE).
