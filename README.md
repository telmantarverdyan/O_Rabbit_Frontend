# O_Rabbit Admin UI

Web console for an **O_Rabbit** master: log in to a master, start and cancel runs, follow them live, and manage jobs, connections and workers.

Built with React 18, TypeScript, Vite, Tailwind CSS, lucide-react and TanStack React Query. All data comes from the master's `/api/v1` REST and SSE API (see `../O_Rabbit/docs/openapi.yaml`). There is no mock data.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and log in with:

| Field | Value |
|---|---|
| Master address | The master's `ORABBIT_HTTP_ADDR`, for example `http://10.0.0.5:9100` (default port `9100`) |
| API token | The master's `ORABBIT_HTTP_AUTH_TOKEN` |

The address is remembered in `localStorage`. The token is kept in `sessionStorage`, so closing the tab logs you out. If the master rejects the token (HTTP 401), the UI returns to the login page.

`VITE_ORABBIT_BACKEND_URL` (see `.env.example`) only sets the address prefilled on the login page.

## How requests reach the master

The master sends no CORS headers, so the browser cannot call it directly. Instead the UI calls its own origin (`/api/v1/...`, `/status`) and adds an `X-ORabbit-Master` header with the address from the login. The `orabbit-master-proxy` plugin in `vite.config.ts` forwards those requests to that master, streaming responses so live events (SSE) work.

This proxy runs in `npm run dev` and `npm run preview` only. The Nginx image in `Dockerfile` serves the static files and does **not** proxy to a master yet.

## Views

| Route | What it does | Master endpoints |
|---|---|---|
| `/login` | Connect to a master | `GET /status` |
| `/` | Run counts, live workers, jobs, connections, recent runs | `GET /runs`, `/workers`, `/jobs`, `/connections` |
| `/runs/new` | One-shot run with every option: source (engine, DSN, table/query, cursor, incremental, WHERE, columns, column types, record path, format), S3 target, Iceberg registration, performance, consistency, worker pool. **Validate** first or **Start run** directly. | `GET /source-engines`, `POST /runs/validate`, `POST /runs/submit` |
| `/runs` | Paged run list, status filter, cancel | `GET /runs`, `POST /runs/{id}/cancel` |
| `/runs/:id` | Progress, tasks, live events, diagnosis, artifacts; cancel, recover, retry/cancel Iceberg registration | `GET /runs/{id}` (+ `/progress`, `/events/stream`, `/diagnosis`, `/artifacts`), `POST /runs/{id}/cancel`, `/recover`, `/registration/retry`, `/registration/cancel` |
| `/jobs` | Create, edit, delete and **run** stored jobs | `/jobs`, `POST /jobs/{id}/runs` |
| `/connections` | Create, edit and delete source and S3 target connections | `/connections` |
| `/workers` | Workers, enrollment tokens, worker identities (revoke) | `GET /workers`, `POST /workers/enrollment-tokens`, `GET /workers/identities`, `POST /workers/identities/{id}/revoke` |

## Build and test

```bash
npm run build   # tsc type-check + production build to dist/
npm test        # vitest
```
