# O_Rabbit Admin Dashboard & Web Console

Modern operator console and administrative dashboard for the **O_Rabbit** distributed lakehouse data ingestion engine.

Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **Lucide Icons**, and **TanStack React Query**.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will open on `http://localhost:5173`.

### 3. Configure Master Backend Target
By default, the Vite dev server proxies API calls and Server-Sent Events (SSE) to `http://localhost:8080`.

To point to a remote master (e.g. VPS or custom port), create a `.env` file or export `VITE_ORABBIT_BACKEND_URL`:

```bash
# .env
VITE_ORABBIT_BACKEND_URL=http://185.2.103.18:9100
```

Alternatively, you can configure the backend URL and Bearer Auth Token directly in the UI via the **Settings** or **Configure Token** button in the header.

---

## 🏗️ Production Build & Container Deployment

### Local Build
To compile static assets for production:

```bash
npm run build
```

Compiled files are placed in `dist/`.

### 🐳 Docker & Docker Compose Deployment
Run the production Nginx container locally or in your Kubernetes / Docker cluster:

```bash
# Using Docker Compose
docker compose up -d

# Or build & run directly
docker build -t orabbit-admin-ui .
docker run -d -p 3000:80 --name orabbit-ui orabbit-admin-ui
```

Check health status:
```bash
curl http://localhost:3000/healthz
# Returns: OK
```

---

## ✨ Features & Views

- **📊 Overview Dashboard (`/`)**:
  - High-level KPIs: Active Ingestion Runs, Connected Worker Fleet, Export Jobs, and Total Ingested GB / Rows.
  - In-Flight Ingestion tracker with live task progress.
  - Master Node state, PID, gRPC/HTTP ports, and Leadership status.

- **▶️ Ingestion Runs (`/runs`)**:
  - Searchable and filterable table of all historical and active runs.
  - Interactive **Submit Ingestion Run** wizard with Auto-Tune Planner toggles.

- **🔍 Run Details Inspector (`/runs/:id`)**:
  - **Partition Tasks Breakdown**: View assigned worker nodes, cursor range bounds (`[lower..upper]`), rows read, and byte throughput.
  - **Committed Parquet Objects**: Tabular listing of generated Parquet files, rolled parts (`part-000000-001.parquet`), exact byte sizes, and SHA-256 integrity digests.
  - **Live SSE Event Console**: Streaming real-time log terminal showing gRPC worker heartbeats, auto-tune decisions, and commit manifests.
  - **Run Actions**: Cancel in-flight runs, inspect raw metadata/manifest JSON.

- **💼 Export Jobs (`/jobs`)**:
  - Create and manage table/query export jobs with cursor columns, incremental sync flags, and lakehouse target definitions.
  - Trigger one-click runs directly from any job.

- **🗄️ Database & Storage Connections (`/connections`)**:
  - Manage Source Database connectors: **PostgreSQL**, **Oracle**, **MSSQL**, **ClickHouse**, **MySQL**, **MariaDB**, **S3**, **Cassandra**, **Trino**, **SQLite**.
  - Manage Target **S3 / MinIO** buckets and credentials.

- **🖥️ Worker Fleet Telemetry (`/workers`)**:
  - Real-time monitor of connected worker nodes with hostname, CPU core count, OS/Arch, Go runtime version, and animated heartbeat health indicators.

- **🧊 Lakehouse & Datasets Explorer (`/datasets`)**:
  - Browse S3 dataset prefixes, view authoritative `_state.json` High-Water Mark checkpoints, and copy ClickHouse / Altinity Ice queries.

- **⚙️ System & Security Settings (`/settings`)**:
  - Configure backend master endpoints, manage `ORABBIT_HTTP_AUTH_TOKEN`, and inspect live Prometheus telemetry from `/metrics`.
