# Neuraloop — Product Roadmap

## Phase 1: Workspace + Visual Editor (COMPLETE)
- Workspace home & workflow list dashboard
- React Flow canvas with custom nodes, controls, minimap
- Searchable Node Library (Triggers, Actions, Logic)
- Context menu, selection, inspector form, and toolbar
- Local browser state & snapshot undo/redo

## Phase 2: Backend Persistence & Versioning (COMPLETE)
- Neon PostgreSQL connection via Prisma ORM
- Canonical workflow graph model with JSON storage
- Immutable `WorkflowVersion` snapshots (v1, v2, v3)
- REST API routes (`/api/workflows`, `/api/workflows/[id]`, `/api/workflows/[id]/duplicate`)
- Zod graph structure validation & server sanitization
- Decoupled instant editor state with explicit server save (`Ctrl+S`)

## Phase 3: Node-Specific Configuration Schemas & UI (UPCOMING)
- Typed configuration schemas for each node type (e.g. HTTP URL/method/headers, OpenAI prompt/model, Slack channel)
- Custom property editors in `NodeInspector`
- Multi-port branching handles for `IF` and `Filter` nodes

## Phase 4: Execution Engine & Queue Processing (DEFERRED)
- Redis / BullMQ worker execution runtime
- Per-node execution state passing
- Execution history and run logs tab

## Phase 5: AI Workflow Generation & Copilot (DEFERRED)
- Natural language to canonical workflow JSON translation pipeline
- Canvas copilot assistant
