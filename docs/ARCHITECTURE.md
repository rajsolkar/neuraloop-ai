# Neuraloop — Architecture Overview (Phase 4)

## Architecture Overview

```
Visual Editor (React Flow + Canvas)
  ├── Toolbar Test Button -> TestExecutionDialog
  └── Explicit Save (Ctrl+S) -> PUT /api/workflows/[id]
       ↓
Server REST API (POST /api/workflows/[id]/execute)
       ↓
WorkflowEngine (src/lib/execution/engine.ts)
  ├── Load WorkflowVersion (Immutable snapshot)
  ├── Graph Cycle Detection & Topological Resolution
  ├── Execution Context & Expression Resolver
  └── NodeExecutorRegistry (src/lib/execution/executors/registry.ts)
       ├── ManualTriggerExecutor
       ├── HttpRequestExecutor (SSRF Protection & Timeout)
       ├── OpenAiExecutor (CREDENTIAL_NOT_CONFIGURED check)
       ├── SlackExecutor (CREDENTIAL_NOT_CONFIGURED check)
       ├── EmailExecutor (CREDENTIAL_NOT_CONFIGURED check)
       ├── IfExecutor (Condition evaluation -> TRUE / FALSE branch)
       ├── FilterExecutor (Condition evaluation -> Pass / Skip)
       ├── DelayExecutor (Bounded delay execution)
       └── ScheduleExecutor & WebhookExecutor
       ↓
Prisma ORM (prisma/schema.prisma)
       ↓
Neon PostgreSQL (WorkflowExecution & NodeExecution tables)
```

## Key Architectural Highlights

1. **Decoupled Server Runtime**: Execution is server-side and operates on canonical `WorkflowVersion` definitions stored in Neon PostgreSQL.
2. **Graph Traversal & Topological Ordering**: Dynamic queue-based traversal executing nodes according to edge connectivity, independent of nodes array storage order.
3. **Multi-Port IF Branch Execution**: Evaluates condition rules, following the selected branch matching `sourceHandle: "true"` or `sourceHandle: "false"`. Non-selected branch path nodes are marked `skipped`.
4. **Data Passing & Safe Expressions**: Passes node outputs downstream using safe property resolution (`{{lead.score}}`) without `eval` or `new Function`.
5. **SSRF URL Security**: Enforces URL checks blocking `localhost`, private IPs, and cloud metadata endpoints with 10s timeouts.
6. **Cycle Detection**: Aborts cyclic graph dependencies (`A -> B -> A`) with `WORKFLOW_CYCLE_DETECTED` errors.
7. **Database Persistence**: Stores `WorkflowExecution` and `NodeExecution` logs in Neon PostgreSQL.
