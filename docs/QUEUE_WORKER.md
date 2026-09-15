# Neuraloop — Queue & Worker Architecture Specification (Phase 5)

## Overview

Phase 5 introduces asynchronous queue orchestration and background job execution using BullMQ, Redis (with Upstash compatibility), and a dedicated Node.js worker process (`npm run worker`). The existing Phase 4 `WorkflowEngine` is reused as the single source of truth for workflow execution.

```
Frontend (Test Button / API Call)
   ↓
POST /api/workflows/[id]/execute
   ↓
Create WorkflowExecution (Status: "queued")
   ↓
Enqueue Job in BullMQ ("workflow-executions")
   ↓
Redis Queue (Upstash / Local)
   ↓
Node.js Worker Process (npm run worker / src/worker/index.ts)
   ↓
WorkflowEngine.executeWorkflow() (Phase 4 Engine)
   ↓
Node Executors (HTTP, OpenAI, IF, Filter, Delay, etc.)
   ↓
Neon PostgreSQL (WorkflowExecution & NodeExecution tables)
```

## BullMQ Job Structure

* **Queue Name**: `workflow-executions`
* **Job Payload**:
  ```json
  {
    "executionId": "exec-x1y2z3",
    "workflowId": "w-12345",
    "workflowVersionId": "ver-67890",
    "input": { "lead": { "score": 95 } }
  }
  ```
* **Job Options**:
  * `attempts`: 2 (job-level retries for worker/network infrastructure issues)
  * `backoff`: Exponential (delay 1000ms)
  * `removeOnComplete`: Keep last 1000 jobs for 24h
  * `removeOnFail`: Keep last 5000 jobs for 7 days

## Distinguishing Node Retries vs Queue Retries

1. **Node-Level Retries (Phase 4)**: Managed inside `WorkflowEngine` during node execution for transient executor failures (`config.maxRetries`, default 1 retry).
2. **Queue-Level Retries (Phase 5)**: Managed by BullMQ when a worker process crashes mid-job or encounters process-level network failure (`attempts: 2`).

## Execution State Lifecycle

```
[ queued ] ──(Worker picks up job)──> [ running ] ──(Engine succeeds)──> [ success ]
    │                                     │
    ├──(Cancellation requested)           ├──(Engine fails)────────────> [ failed ]
    ▼                                     │
[ cancelled ]                             └──(User cancels)────────────> [ cancelled ]
```

## Running the Worker Process

```bash
# Start background worker process locally
npm run worker
```

## Worker Concurrency & Graceful Shutdown

* **Concurrency**: Configurable via `WORKER_CONCURRENCY` environment variable (default: `5`).
* **Graceful Shutdown**: Handles `SIGINT` and `SIGTERM` signals cleanly by finishing active jobs, closing the BullMQ worker connection, and disconnecting Prisma cleanly.
