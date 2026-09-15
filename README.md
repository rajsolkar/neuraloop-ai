# Neuraloop

AI-first workflow automation platform. **Phase 5: Background Execution, BullMQ, Redis & Execution Monitoring.**

Build visual workflows by dragging nodes from a library onto an infinite canvas, connecting them with branching handles, editing typed node configurations in a dynamic inspector, persisting canonical workflow graphs to a Neon PostgreSQL database via Prisma ORM with versioning support, enqueuing executions into BullMQ / Redis queues, and processing them via a dedicated background worker.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript 5
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css` + design tokens)
- **@xyflow/react 12** — canvas, custom nodes, branching handles (`TRUE` / `FALSE`), edges, minimap, controls
- **Zustand 5** — UI, toast, workflow collection, and active editor session state with snapshot undo/redo
- **BullMQ & Redis** — background job queue orchestration (`workflow-executions`)
- **Prisma 5 & Neon PostgreSQL** — canonical workflow storage, versioning, `WorkflowExecution` & `NodeExecution` tables
- **Zod 3** — typed configuration schemas and server-side graph structure validation
- **Radix UI** (+ shadcn-style wrappers in `src/components/ui/`), `cva`, `tailwind-merge`
- **Vitest** — unit, executor, queue, and API integration tests (75 passed)

## Architecture

```
Frontend (Canvas / Toolbar Test Button)
   ↓
POST /api/workflows/[id]/execute
   ↓
Create WorkflowExecution (Status: "queued")
   ↓
BullMQ Queue ("workflow-executions") -> Redis
   ↓
Node.js Worker Process (npm run worker / src/worker/index.ts)
   ↓
WorkflowEngine.executeWorkflow() (Phase 4 Engine)
   ↓
Neon PostgreSQL (WorkflowExecution & NodeExecution tables)
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your Neon PostgreSQL and Redis connection strings in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   REDIS_URL="rediss://default:password@sample-redis.upstash.io:6379"
   ```
3. Run database migrations and generate Prisma client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run worker` | Start the dedicated background execution worker process |
| `npm run build` | Production build (`next build`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint checks |
| `npm test` | Run Vitest unit & API integration tests (75 tests) |
| `npx prisma generate` | Generate Prisma Client types |