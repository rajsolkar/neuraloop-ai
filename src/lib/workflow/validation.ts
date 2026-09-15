import { z } from "zod";
import { NODE_DEFINITION_MAP } from "./node-definitions";
import { validateNodeConfig } from "./config-schemas";

export const NodeCategorySchema = z.enum(["trigger", "action", "logic"]);
export const WorkflowStatusSchema = z.enum(["draft", "published", "archived"]);

export const WorkflowNodeDataSchema = z
  .object({
    definitionId: z.string().refine((defId) => Boolean(NODE_DEFINITION_MAP[defId]), {
      message: "Unsupported or unregistered node definition ID",
    }),
    label: z.string().min(1, "Node label cannot be empty"),
    description: z.string(),
    category: NodeCategorySchema,
    config: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1, "Node ID cannot be empty"),
  type: z.literal("neuraloop-node").default("neuraloop-node"),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  deletable: z.boolean().optional(),
  connectable: z.boolean().optional(),
  draggable: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: WorkflowNodeDataSchema,
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1, "Edge ID cannot be empty"),
  source: z.string().min(1, "Edge source node ID required"),
  target: z.string().min(1, "Edge target node ID required"),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
});

export const WorkflowDefinitionSchema = z
  .object({
    name: z.string().min(1, "Workflow name cannot be empty"),
    description: z.string().default(""),
    status: WorkflowStatusSchema.default("draft"),
    nodes: z.array(WorkflowNodeSchema).default([]),
    edges: z.array(WorkflowEdgeSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const nodeMap = new Map<string, (typeof data.nodes)[0]>();
    for (let index = 0; index < data.nodes.length; index++) {
      const node = data.nodes[index];
      if (nodeMap.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate node ID detected: ${node.id}`,
          path: ["nodes", index, "id"],
        });
      }
      nodeMap.set(node.id, node);

      // Validate node-specific config if present
      if (node.data.config) {
        const configValidation = validateNodeConfig(
          node.data.definitionId,
          node.data.config,
        );
        if (!configValidation.success && configValidation.error) {
          for (const issue of configValidation.error.issues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid node config for ${node.data.definitionId}: ${issue.message}`,
              path: ["nodes", index, "data", "config", ...issue.path],
            });
          }
        }
      }
    }

    const edgeIds = new Set<string>();
    for (let index = 0; index < data.edges.length; index++) {
      const edge = data.edges[index];
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate edge ID detected: ${edge.id}`,
          path: ["edges", index, "id"],
        });
      }
      edgeIds.add(edge.id);

      if (edge.source === edge.target) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Self-loop connection rejected on node: ${edge.source}`,
          path: ["edges", index],
        });
      }

      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Orphan edge source node ID not found: ${edge.source}`,
          path: ["edges", index, "source"],
        });
      } else if (sourceNode.data.definitionId === "if") {
        // Validate IF node sourceHandle if specified
        if (
          edge.sourceHandle &&
          edge.sourceHandle !== "true" &&
          edge.sourceHandle !== "false" &&
          edge.sourceHandle !== "out"
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid IF node sourceHandle: ${edge.sourceHandle}. Expected "true" or "false".`,
            path: ["edges", index, "sourceHandle"],
          });
        }
      }

      if (!nodeMap.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Orphan edge target node ID not found: ${edge.target}`,
          path: ["edges", index, "target"],
        });
      }
    }
  });

export const CreateWorkflowInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: WorkflowStatusSchema.optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
});

export const UpdateWorkflowInputSchema = z.object({
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: WorkflowStatusSchema.optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
  createVersion: z.boolean().optional(),
});

export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;
