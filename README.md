# Letta Control Panel (LettaCP)

A self-hosted **administration dashboard** for [Letta App Servers](https://github.com/letta-ai/letta). It gives you a single, dark-themed control plane to inspect and manage the agents, memory, tools, and network topology running on your Letta server — including an interactive **Dark Galaxy orbital map** and **dual-mode memory inspection**.

---

## ✨ Features

- **Agent Inspector** — Browse agents, view tool bindings, edit the model, and save memory changes.
- **Dual-mode memory inspection** — Core memory (`system/*`) and file-based **MemFS** are split into two panes so you can read and edit either one.
- **Dark Galaxy orbital map** — A React Flow (`@xyflow/react`) visualization that renders your agents and their memory files as nodes orbiting a central core, with click-to-inspect drawers.
- **Shared knowledge / blocks** — Inspect shared memory blocks across agents, filter by agent, and download snapshots. Shared files are written to every agent's memory **and automatically referenced in each agent's system prompt** so agents know to read them; any per-agent write failures are surfaced as warnings.
- **Network topology** — See how agents, memory files, and shared blocks are connected at a glance.
- **Activity panel** — Stream per-agent activity from the App Server.
- **Runtime settings** — Configure the Letta App Server URL, Ollama endpoint, and default embedding provider live from the Settings page — no code edits or redeploys needed.
- **Password-gated dashboard** — Optional single-password login (`DASHBOARD_PASSWORD`) guarding the whole app.
- **Webhook sync** — `POST /api/webhooks/sync` to push shared memory files into agents programmatically.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App (LettaCP)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│  │ Dashboard  │  │  Network   │  │  Agents    │  │ Settings│ │
│  └────────────┘  └────────────┘  └────────────┘  └─────────┘ │
│            │  (client components + /api/** routes)           │
└────────────┼─────────────────────────────────────────────────┘
             │  HTTPS / WebSocket (proxied server-side)
             ▼
      ┌───────────────────┐
      │  Letta App Server │   ← the backend you manage
      │  (REST + WS)      │
      └───────────────────┘
```

Because the Letta App Server WebSocket requires an `Authorization: Bearer <token>` header that a browser `WebSocket` cannot send, **all App Server traffic is proxied through the Next.js Node server** (`lib/letta-server.ts`) using the `ws` library. Client components talk to the `app/api/**` routes.

The server-side runtime config (`lib/config.ts`) is synchronized with the client via `GET/POST /api/config` — so changing the Letta URL or embedding provider in Settings is immediately available to both layers.

---

## 🧰 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, `output: "standalone"`) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| Graph | [React Flow / `@xyflow/react`](https://reactflow.dev/) |
| Icons | `lucide-react` |
| SDK | `@letta-ai/letta-agent-sdk` (Node build, `backend: "remote"`) |
| WebSocket | `ws` (server-side proxy) |
| Container | Docker (multi-stage, Alpine, non-root) |
| Deploy | Docker Compose, or standalone on any host (Proxmox-friendly) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js **22+** (local dev), or
- Docker + Docker Compose (recommended), and
- A running **Letta App Server** you can reach, plus its **auth token**.

### Option A — Docker (recommended)

1. Clone the repo and create a `.env` file (a `.env.example` is provided):

   ```bash
   git clone https://github.com/siderismsp/LettaCP.git
   cd LettaCP
   cp .env.example .env
   ```

2. Edit `.env` — set at minimum:

   ```env
   DASHBOARD_PASSWORD=your-admin-password
   LETTA_APP_SERVER_URL=http://your-letta-host:8283
   LETTA_AUTH_TOKEN=your-letta-auth-token
   ```

3. Build and start:

   ```bash
   docker compose up -d --build
   ```

4. Open **http://localhost:3001** (the Compose file maps container port `3000` → host `3001`).

### Option B — Local development

```bash
npm install
cp .env.example .env.local   # then edit as needed
npm run dev                  # http://localhost:3000
```

### Option C — Production (standalone)

```bash
npm ci
npm run build
npm run start                # runs .next/standalone/server.js
```

> `npm run build` produces a self-contained standalone output under `.next/standalone`, which is exactly what the `Dockerfile` copies into the final image.

---

## ⚙️ Configuration

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHBOARD_PASSWORD` | Optional | Enables password login for the whole dashboard. Leave empty to disable auth. |
| `LETTA_APP_SERVER_URL` | Yes* | Default Letta App Server URL the dashboard proxies to. *Falls back to `NEXT_PUBLIC_DEFAULT_LETTA_URL`, then `http://localhost:8283`. |
| `NEXT_PUBLIC_DEFAULT_LETTA_URL` | No | Build-time client default when no runtime override is set. |
| `LETTA_AUTH_TOKEN` | Yes | Token used for the App Server WebSocket handshake (`Authorization: Bearer`). |
| `LETTA_REQUEST_TIMEOUT_MS` | No | Request timeout for the App Server client (default `120000`). |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | No | Abort client-side fetches after this many ms so the UI never spins forever (default `30000`). |
| `OLLAMA_BASE_URL` | No | Fallback Ollama base URL used to populate model selectors (default `http://localhost:11434`). |
| `NEXT_PUBLIC_DEFAULT_EMBEDDING_MODEL` | No | Default embedding model (default `nomic-embed-text`). |
| `NEXT_PUBLIC_DEFAULT_EMBEDDING_ENDPOINT` | No | Default embedding endpoint (default empty). |
| `WEBHOOK_SECRET` | Optional | Shared secret that protects `POST /api/webhooks/sync`. When set, requests must supply it via `x-webhook-secret` header or `?token=`. |

> **Security note:** `DASHBOARD_PASSWORD` and `LETTA_AUTH_TOKEN` are real secrets — keep them in a git-ignored `.env` / `.env.local` file. Never commit real values; `.env.example` only contains placeholders.

### Dynamic settings page

Most of the above can be changed **at runtime** from the **Settings** page, without editing source or redeploying:

- **Letta host / port** — overrides `LETTA_APP_SERVER_URL` for the current server process.
- **Ollama connection** — base URL used by the model dropdown (persisted in `localStorage`).
- **Default embedding provider** — model + endpoint, saved to the server (`/api/config`) and mirrored to `localStorage` as an offline cache.

The server-side config store (`lib/config.ts`) is the source of truth; the client reads/writes it through `GET /api/config` and `POST /api/config`.

---

## 🔌 API Surface

The dashboard exposes its own REST API (all behind the auth middleware when `DASHBOARD_PASSWORD` is set):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/config` | GET / POST | Read or update runtime config (Letta URL, embedding). |
| `/api/agents` | GET | List agents. |
| `/api/agents/:id` | GET / PATCH | Get / update an agent. |
| `/api/agents/:id/memory` | GET / PUT | Inspect / update an agent's memory files. |
| `/api/agents/:id/activity` | GET | Per-agent activity stream. |
| `/api/network` | GET | Agents + memory topology for the map. |
| `/api/shared-memory` | GET | Shared memory blocks. |
| `/api/shared-memory/:name` | GET | A specific shared block. |
| `/api/models` | GET | Model list (proxies to Ollama). |
| `/api/snapshot` | GET | Download a snapshot backup. |
| `/api/webhooks/sync` | POST | Push a shared memory file into agents (webhook). |
| `/api/auth/login`, `/api/auth/logout` | POST | Session auth. |

---

## 📁 Project Structure

```
app/                 # App Router pages + API routes
components/          # React components (map, cards, panels, ui)
lib/                 # Server/client helpers, config, auth, hooks
public/              # Static assets
docker-compose.yml   # Container deployment
Dockerfile           # Multi-stage, non-root standalone build
```

---

## 📄 License

This project is released under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

Built on top of [Letta](https://github.com/letta-ai/letta) and its official SDKs. The network map is powered by [React Flow](https://reactflow.dev/).



