import {
  Brain,
  Clock3,
  Filter,
  GitBranch,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Timer,
  Webhook,
  Zap,
  Variable,
  Code,
  ArrowRightCircle,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { NodeCategory } from "@/types/workflow";

export interface NodeDefinition {
  /** Stable registry key. Serialized into node data. */
  id: string;
  /** Display name. */
  name: string;
  category: NodeCategory;
  description: string;
  icon: LucideIcon;
  /** Accent color used for the icon chip + handle tint. */
  accentColor: string;
  /** Default label applied to a freshly added node. */
  defaultLabel: string;
  /** Whether the node can start a workflow. */
  isTrigger: boolean;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    id: "manual-trigger",
    name: "Manual Trigger",
    category: "trigger",
    description: "Start the workflow manually.",
    icon: Zap,
    accentColor: "#39ff14",
    defaultLabel: "Manual Trigger",
    isTrigger: true,
  },
  {
    id: "webhook",
    name: "Webhook",
    category: "trigger",
    description: "Receive an HTTP request to start a run.",
    icon: Webhook,
    accentColor: "#39ff14",
    defaultLabel: "Webhook",
    isTrigger: true,
  },
  {
    id: "schedule",
    name: "Schedule",
    category: "trigger",
    description: "Run the workflow on a schedule.",
    icon: Clock3,
    accentColor: "#39ff14",
    defaultLabel: "Schedule",
    isTrigger: true,
  },
  {
    id: "http-request",
    name: "HTTP Request",
    category: "action",
    description: "Send an HTTP request to a URL.",
    icon: Send,
    accentColor: "#3d7bfd",
    defaultLabel: "HTTP Request",
    isTrigger: false,
  },
  {
    id: "ai",
    name: "AI Agent / LLM",
    category: "action",
    description: "Run prompts using OpenAI, Claude, or Gemini LLMs.",
    icon: Brain,
    accentColor: "#8b5cf6",
    defaultLabel: "AI Agent",
    isTrigger: false,
  },
  {
    id: "slack",
    name: "Slack",
    category: "action",
    description: "Send a message to a Slack channel.",
    icon: MessageSquare,
    accentColor: "#3aa07e",
    defaultLabel: "Slack",
    isTrigger: false,
  },
  {
    id: "email",
    name: "Email",
    category: "action",
    description: "Send an email to one or more recipients.",
    icon: Mail,
    accentColor: "#d98a21",
    defaultLabel: "Email",
    isTrigger: false,
  },
  {
    id: "code",
    name: "Code",
    category: "action",
    description: "Run custom JavaScript code snippet to transform data.",
    icon: Code,
    accentColor: "#ec4899",
    defaultLabel: "Code",
    isTrigger: false,
  },
  {
    id: "webhook-response",
    name: "Webhook Response",
    category: "action",
    description: "Return a custom HTTP response for incoming webhooks.",
    icon: ArrowRightCircle,
    accentColor: "#10b981",
    defaultLabel: "Webhook Response",
    isTrigger: false,
  },
  {
    id: "if",
    name: "IF",
    category: "logic",
    description: "Branch the workflow based on a condition.",
    icon: GitBranch,
    accentColor: "#8b5cf6",
    defaultLabel: "IF",
    isTrigger: false,
  },
  {
    id: "filter",
    name: "Filter",
    category: "logic",
    description: "Let items through that match a rule.",
    icon: Filter,
    accentColor: "#1e8d7d",
    defaultLabel: "Filter",
    isTrigger: false,
  },
  {
    id: "set-variable",
    name: "Set Variable",
    category: "logic",
    description: "Set dynamic variables or transform workflow state.",
    icon: Variable,
    accentColor: "#06b6d4",
    defaultLabel: "Set Variable",
    isTrigger: false,
  },
  {
    id: "delay",
    name: "Delay",
    category: "logic",
    description: "Pause the workflow for a set duration.",
    icon: Timer,
    accentColor: "#64748b",
    defaultLabel: "Delay",
    isTrigger: false,
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "action",
    description: "Send messages or photos via Telegram bot.",
    icon: Send,
    accentColor: "#0088cc",
    defaultLabel: "Telegram",
    isTrigger: false,
  },
  {
    id: "discord",
    name: "Discord",
    category: "action",
    description: "Send messages or embeds to Discord webhooks.",
    icon: MessageSquare,
    accentColor: "#5865F2",
    defaultLabel: "Discord",
    isTrigger: false,
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "action",
    description: "Read or append rows in Google Sheets spreadsheets.",
    icon: ArrowRightCircle,
    accentColor: "#0F9D58",
    defaultLabel: "Google Sheets",
    isTrigger: false,
  },
  {
    id: "loop",
    name: "Loop",
    category: "logic",
    description: "Iterate over array elements sequentially.",
    icon: Timer,
    accentColor: "#f59e0b",
    defaultLabel: "Loop",
    isTrigger: false,
  },
  {
    id: "switch",
    name: "Switch",
    category: "logic",
    description: "Route workflow execution across multiple branch paths.",
    icon: GitBranch,
    accentColor: "#10b981",
    defaultLabel: "Switch",
    isTrigger: false,
  },
  {
    id: "merge",
    name: "Merge",
    category: "logic",
    description: "Merge multiple execution branches into a single output.",
    icon: Filter,
    accentColor: "#6366f1",
    defaultLabel: "Merge",
    isTrigger: false,
  },
  {
    id: "transform",
    name: "Transform",
    category: "logic",
    description: "Manipulate, reshape, format, and compute data structures.",
    icon: Wand2,
    accentColor: "#a855f7",
    defaultLabel: "Transform",
    isTrigger: false,
  },
];

export const NODE_DEFINITION_MAP: Record<string, NodeDefinition> = {
  ...Object.fromEntries(NODE_DEFINITIONS.map((def) => [def.id, def])),
  openai: NODE_DEFINITIONS.find((def) => def.id === "ai")!,
};

export const NODE_DEFINITIONS_BY_CATEGORY: Record<
  NodeCategory,
  NodeDefinition[]
> = {
  trigger: [],
  action: [],
  logic: [],
};

for (const def of NODE_DEFINITIONS) {
  NODE_DEFINITIONS_BY_CATEGORY[def.category].push(def);
}

export { NODE_CATEGORY_ORDER } from "./node-colors";

export function getNodeDefinition(defId: string): NodeDefinition | undefined {
  if (defId === "openai") return NODE_DEFINITIONS.find((def) => def.id === "ai");
  return NODE_DEFINITIONS.find((def) => def.id === defId);
}

export const NODE_DEFINITION_CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "Triggers",
  action: "Actions",
  logic: "Logic",
};