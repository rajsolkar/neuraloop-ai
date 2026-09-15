# Neuraloop — Workflow Execution Engine Specification (Phase 4)

## Architecture Overview

```
Workflow (Neon PostgreSQL)
   ↓
WorkflowVersion (Immutable Snapshot)
   ↓
Execution Request (POST /api/workflows/[id]/execute)
   ↓
WorkflowEngine (src/lib/execution/engine.ts)
   ├── Cycle Detection (DFS)
   ├── Start Node Identification
   └── Queue-Based Graph Traversal
        ↓
NodeExecutorRegistry (src/lib/execution/executors/registry.ts)
   ├── ManualTriggerExecutor
   ├── HttpRequestExecutor (SSRF Protection & Timeouts)
   ├── OpenAiExecutor (CREDENTIAL_NOT_CONFIGURED check)
   ├── SlackExecutor (CREDENTIAL_NOT_CONFIGURED check)
   ├── EmailExecutor (CREDENTIAL_NOT_CONFIGURED check)
   ├── IfExecutor (Evaluates condition -> TRUE / FALSE branch)
   ├── FilterExecutor (Evaluates condition -> Pass / Skip)
   ├── DelayExecutor (Bounded duration execution)
   ├── ScheduleExecutor & WebhookExecutor
        ↓
Prisma ORM (WorkflowExecution & NodeExecution tables in Neon)
```

## Key Engine Features

1. **Independent Runtime**: Operates server-side on canonical `WorkflowVersion` definitions, entirely decoupled from React / React Flow editor state.
2. **Deterministic Graph Traversal**: Computes node execution order dynamically based on graph edge connectivity, independent of nodes array order.
3. **Multi-Port IF Branching**: Evaluates condition rules (`field`, `operator`, `value`). Directs execution flow along the selected branch matching `sourceHandle: "true"` or `sourceHandle: "false"`. Non-selected branch path nodes are recorded as `skipped`.
4. **Data Passing & Safe Expressions**: Passes previous node output data downstream to next nodes using safe property resolution (`{{lead.score}}`) without `eval` or `new Function`.
5. **SSRF URL Security**: Enforces URL validation blocking `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` cloud metadata endpoints, with a 10s request timeout limit.
6. **Cycle Detection**: Aborts cyclic dependency graphs (`A -> B -> A`) with structured `WORKFLOW_CYCLE_DETECTED` errors.
7. **Database Persistence**: Stores complete `WorkflowExecution` and `NodeExecution` records in Neon PostgreSQL.

## Database Schema (Prisma)

- `WorkflowExecution`: `id`, `workflowId`, `workflowVersionId`, `status`, `startedAt`, `completedAt`, `duration`, `input`, `output`, `error`, `metadata`.
- `NodeExecution`: `id`, `executionId`, `nodeId`, `nodeType`, `status`, `startedAt`, `completedAt`, `duration`, `input`, `output`, `error`, `attempt`.

## Execution REST APIs

- `POST /api/workflows/[id]/execute`: Triggers execution of specified workflow version.
- `GET /api/executions/[id]`: Returns execution record and node execution breakdown.
- `GET /api/workflows/[id]/executions`: Lists recent execution history for a workflow.

## Why Redis / BullMQ is Deferred to Phase 5
Phase 4 implements a deterministic, fully in-process execution engine. Distributed worker queues (Redis / BullMQ) belong to Phase 5 to enable background async queue processing once the core runtime semantics are complete and verified.
