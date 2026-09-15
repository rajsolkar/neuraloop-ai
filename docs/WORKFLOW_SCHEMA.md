# Neuraloop — Workflow Schema & Execution Models Specification (Phase 4)

## Canonical Workflow JSON Example with Config & IF Branching

```json
{
  "name": "Lead Routing Pipeline",
  "description": "Evaluate incoming leads and route via Slack or Email",
  "status": "draft",
  "nodes": [
    {
      "id": "n_manual",
      "type": "neuraloop-node",
      "position": { "x": 0, "y": 0 },
      "data": {
        "definitionId": "manual-trigger",
        "label": "Manual Trigger",
        "description": "Start workflow manually",
        "category": "trigger",
        "config": {}
      }
    },
    {
      "id": "n_if",
      "type": "neuraloop-node",
      "position": { "x": 280, "y": 0 },
      "data": {
        "definitionId": "if",
        "label": "Check Score > 80",
        "description": "Branch on lead score",
        "category": "logic",
        "config": {
          "condition": {
            "field": "lead.score",
            "operator": "greater_than",
            "value": "80"
          }
        }
      }
    },
    {
      "id": "n_slack",
      "type": "neuraloop-node",
      "position": { "x": 580, "y": -60 },
      "data": {
        "definitionId": "slack",
        "label": "Notify VIP Sales",
        "description": "Post to Slack",
        "category": "action",
        "config": {
          "channel": "#sales-vip",
          "message": "High priority lead received!"
        }
      }
    },
    {
      "id": "n_email",
      "type": "neuraloop-node",
      "position": { "x": 580, "y": 60 },
      "data": {
        "definitionId": "email",
        "label": "Nurture Email",
        "description": "Send nurture email",
        "category": "action",
        "config": {
          "to": "lead@example.com",
          "subject": "Thanks for your interest",
          "body": "We received your inquiry."
        }
      }
    }
  ],
  "edges": [
    {
      "id": "e_1",
      "source": "n_manual",
      "target": "n_if",
      "sourceHandle": "out",
      "targetHandle": "in",
      "type": "smoothstep"
    },
    {
      "id": "e_true",
      "source": "n_if",
      "target": "n_slack",
      "sourceHandle": "true",
      "targetHandle": "in",
      "type": "smoothstep"
    },
    {
      "id": "e_false",
      "source": "n_if",
      "target": "n_email",
      "sourceHandle": "false",
      "targetHandle": "in",
      "type": "smoothstep"
    }
  ]
}
```

## Execution Data Models (Prisma)

```prisma
model WorkflowExecution {
  id                String          @id @default(uuid())
  workflowId        String
  workflowVersionId String
  status            String          @default("queued") // queued, running, success, failed, cancelled
  startedAt         DateTime        @default(now())
  completedAt       DateTime?
  duration          Int?            // in milliseconds
  input             Json?
  output            Json?
  error             String?
  metadata          Json?
  workflow          Workflow        @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  version           WorkflowVersion @relation(fields: [workflowVersionId], references: [id], onDelete: Cascade)
  nodeExecutions    NodeExecution[]

  @@index([workflowId])
  @@index([workflowVersionId])
  @@index([status])
  @@index([startedAt])
  @@map("workflow_executions")
}

model NodeExecution {
  id          String            @id @default(uuid())
  executionId String
  nodeId      String
  nodeType    String
  status      String            @default("pending") // pending, running, success, failed, skipped, cancelled
  startedAt   DateTime          @default(now())
  completedAt DateTime?
  duration    Int?              // in milliseconds
  input       Json?
  output      Json?
  error       String?
  attempt     Int               @default(1)
  execution   WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)

  @@index([executionId])
  @@index([nodeId])
  @@index([status])
  @@map("node_executions")
}
```
