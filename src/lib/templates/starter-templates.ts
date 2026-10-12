import { prisma } from "@/lib/prisma";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { validateNodeConfig } from "@/lib/workflow/config-schemas";

export interface StarterCredentialRequirement {
  provider: string;
  name: string;
  description: string;
  required: boolean;
}

export interface StarterTemplateItem {
  id: string;
  number: string;
  name: string;
  shortName: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  difficultyOrder: number;
  category: string;
  icon: string;
  tags: string[];
  credentialRequirements: StarterCredentialRequirement[];
  flowSequence: string[];
  checklist: string[];
  exampleInput: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  definition: {
    name: string;
    description: string;
    status: "published";
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

export const STARTER_TEMPLATES: StarterTemplateItem[] = [
  // ==========================================================================
  // 01 — API Quickstart
  // ==========================================================================
  {
    id: "starter-01-api-quickstart",
    number: "01",
    name: "01 — API Quickstart",
    shortName: "API Quickstart",
    description: "Send a real GET request to a public API endpoint and inspect the live JSON payload. Zero credentials required.",
    difficulty: "Beginner",
    difficultyOrder: 1,
    category: "API & Webhooks",
    icon: "Send",
    tags: ["api", "http", "quickstart", "beginner"],
    flowSequence: ["Manual Trigger", "HTTP Request"],
    credentialRequirements: [],
    checklist: [
      "Click 'Run' or 'Test Workflow' on the canvas.",
      "The HTTP Request node queries https://dummyjson.com/quotes/random.",
      "Inspect the live response output payload containing quote and author.",
      "No API key or external authentication required.",
    ],
    exampleInput: {},
    expectedOutput: {
      status: 200,
      quoteData: {
        id: 1,
        quote: "Life isn’t about getting and having, it’s about giving and being.",
        author: "Kevin Kruse",
      },
    },
    definition: {
      name: "01 — API Quickstart",
      description: "Trigger a GET request to a public JSON quotes API and capture output payload.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 120, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Manual Trigger",
            description: "Click Run to trigger workflow",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 480, y: 160 },
          data: {
            definitionId: "http-request",
            label: "Fetch Random Quote",
            description: "GET https://dummyjson.com/quotes/random",
            category: "action",
            config: {
              method: "GET",
              url: "https://dummyjson.com/quotes/random",
              authType: "none",
              credentialId: "",
              responseType: "json",
              responseKey: "quoteData",
              timeout: 10000,
              retryCount: 1,
              retryDelay: 1000,
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-http-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 02 — AI Content Generator
  // ==========================================================================
  {
    id: "starter-02-ai-content-generator",
    number: "02",
    name: "02 — AI Content Generator",
    shortName: "AI Content Generator",
    description: "Generate high-converting product descriptions and punchy social media captions using an AI language model.",
    difficulty: "Beginner",
    difficultyOrder: 2,
    category: "AI & Content",
    icon: "Brain",
    tags: ["ai", "content", "copywriting", "llm"],
    flowSequence: ["Manual Trigger", "AI Agent"],
    credentialRequirements: [
      {
        provider: "openai",
        name: "AI Provider (OpenAI / Claude / Gemini)",
        description: "API key to power language model completions.",
        required: true,
      },
    ],
    checklist: [
      "Select the AI Agent node on the canvas to open the Inspector.",
      "Select or create an AI Provider credential (OpenAI, Claude, or Gemini).",
      "Customize the product prompt or use default sample input.",
      "Click 'Run' to generate tailored marketing copy.",
    ],
    exampleInput: {
      productDescription: "Ergonomic walnut standing desk with motorized dual lifts and integrated wireless charging.",
    },
    expectedOutput: {
      text: "Crafted from solid American walnut, this ergonomic standing desk transforms your workspace with whisper-quiet motorized dual lifts...",
      model: "gpt-4o-mini",
      usage: {
        inputTokens: 42,
        outputTokens: 128,
      },
    },
    definition: {
      name: "02 — AI Content Generator",
      description: "Generates product marketing copy and social captions from input details.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 120, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Manual Trigger",
            description: "Provide product input & click Run",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 480, y: 160 },
          data: {
            definitionId: "ai",
            label: "AI Copywriter",
            description: "Generates product description & captions",
            category: "action",
            config: {
              provider: "openai",
              credentialId: "",
              model: "gpt-4o-mini",
              systemPrompt: "You are an expert e-commerce copywriter. Write engaging, high-converting product descriptions and social media captions.",
              prompt: "Generate a compelling 2-paragraph product description and 3 punchy social media captions for: {{input.productDescription}}",
              temperature: 0.7,
              maxTokens: 500,
              responseType: "text",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-ai-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 03 — AI-to-Telegram Assistant
  // ==========================================================================
  {
    id: "starter-03-ai-telegram-assistant",
    number: "03",
    name: "03 — AI-to-Telegram Assistant",
    shortName: "AI-to-Telegram Assistant",
    description: "Receive a customer support question, synthesize a helpful response with AI, and dispatch it to a Telegram channel.",
    difficulty: "Intermediate",
    difficultyOrder: 3,
    category: "AI & Messaging",
    icon: "Send",
    tags: ["telegram", "ai", "support", "messaging"],
    flowSequence: ["Manual Trigger", "AI Agent", "Telegram"],
    credentialRequirements: [
      {
        provider: "openai",
        name: "AI Provider",
        description: "API key for AI support response generation.",
        required: true,
      },
      {
        provider: "telegram",
        name: "Telegram Bot",
        description: "Bot token and target chat ID for message delivery.",
        required: true,
      },
    ],
    checklist: [
      "Attach your AI Provider credential to the AI Copywriter node.",
      "Attach your Telegram Bot credential to the Telegram node.",
      "Enter your target Telegram Chat ID in the Telegram node inspector.",
      "Run the workflow to see AI-drafted assistance arrive in Telegram.",
    ],
    exampleInput: {
      customerQuery: "How do I connect a custom domain to my account?",
      chatId: "-1001234567890",
    },
    expectedOutput: {
      delivered: true,
      telegramMessageId: 4092,
      responseSummary: "Sent AI support reply to Telegram channel.",
    },
    definition: {
      name: "03 — AI-to-Telegram Assistant",
      description: "Answers user inquiry with AI and dispatches reply to Telegram bot/channel.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 100, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Support Query Trigger",
            description: "Receives user inquiry payload",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 440, y: 160 },
          data: {
            definitionId: "ai",
            label: "AI Support Responder",
            description: "Drafts concise support reply",
            category: "action",
            config: {
              provider: "openai",
              credentialId: "",
              model: "gpt-4o-mini",
              systemPrompt: "You are a professional customer support assistant. Provide concise, friendly answers under 100 words.",
              prompt: "Provide a helpful and polite response to this customer query: {{input.customerQuery}}",
              temperature: 0.5,
              maxTokens: 300,
              responseType: "text",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 780, y: 160 },
          data: {
            definitionId: "telegram",
            label: "Send to Telegram",
            description: "Broadcasts AI response to channel",
            category: "action",
            config: {
              credentialId: "",
              chatId: "{{input.chatId}}",
              operation: "send_message",
              text: "*Customer Support Response:*\n\n{{steps.node-ai-1.text}}",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-ai-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-2",
          source: "node-ai-1",
          target: "node-telegram-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 04 — Automated Email Alert
  // ==========================================================================
  {
    id: "starter-04-email-alert",
    number: "04",
    name: "04 — Automated Email Alert",
    shortName: "Automated Email Alert",
    description: "Format critical infrastructure notifications and dispatch them through your authenticated SMTP email server.",
    difficulty: "Intermediate",
    difficultyOrder: 4,
    category: "Notifications",
    icon: "Mail",
    tags: ["email", "smtp", "alerts", "ops"],
    flowSequence: ["Manual Trigger", "Email"],
    credentialRequirements: [
      {
        provider: "smtp",
        name: "SMTP Email Server",
        description: "Host, port, username, and password for outgoing email dispatch.",
        required: true,
      },
    ],
    checklist: [
      "Select the Email node on canvas to open the Inspector.",
      "Select your SMTP Credential or configure host/credentials in Vault.",
      "Set recipient email address in the 'To' field.",
      "Trigger the alert to verify SMTP delivery.",
    ],
    exampleInput: {
      alertType: "Database High Memory Warning",
      severity: "CRITICAL",
      message: "Worker node memory utilization exceeded 92% for 5 consecutive minutes.",
    },
    expectedOutput: {
      sent: true,
      to: "alerts@example.com",
      subject: "[ALERT] System Notification: Database High Memory Warning",
    },
    definition: {
      name: "04 — Automated Email Alert",
      description: "Sends configurable operational alerts via authenticated SMTP.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 120, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Incident Trigger",
            description: "Trigger security/ops incident alert",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 480, y: 160 },
          data: {
            definitionId: "email",
            label: "Send Email Alert",
            description: "Dispatches SMTP alert email",
            category: "action",
            config: {
              credentialId: "",
              to: "alerts@example.com",
              cc: "",
              bcc: "",
              subject: "[ALERT] System Notification: {{input.alertType}}",
              body: "Hello Ops Team,\n\nA system alert was triggered at {{timestamp}}.\n\nSeverity: {{input.severity}}\nDetails: {{input.message}}\n\nPlease review immediately.\n\n— Neuraloop Alert System",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-email-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 05 — Google Sheets Logger
  // ==========================================================================
  {
    id: "starter-05-google-sheets-logger",
    number: "05",
    name: "05 — Google Sheets Logger",
    shortName: "Google Sheets Logger",
    description: "Append structured rows with timestamps and configurable data directly into Google Sheets via Service Account.",
    difficulty: "Intermediate",
    difficultyOrder: 5,
    category: "Data & Storage",
    icon: "FileSpreadsheet",
    tags: ["google-sheets", "audit", "logging", "database"],
    flowSequence: ["Manual Trigger", "Google Sheets"],
    credentialRequirements: [
      {
        provider: "google-sheets-service-account",
        name: "Google Sheets Service Account",
        description: "Google Cloud Service Account JSON key with access to target spreadsheet.",
        required: true,
      },
    ],
    checklist: [
      "Select Google Sheets node to view inspector configuration.",
      "Attach your Google Sheets Service Account credential.",
      "Enter your target Spreadsheet ID and Sheet Name (e.g. 'Sheet1').",
      "Ensure target Google Sheet is shared with your service account email.",
      "Run workflow to append a new log entry row.",
    ],
    exampleInput: {
      eventType: "USER_SIGNUP",
      message: "User alex@company.com joined workspace Beta-1",
    },
    expectedOutput: {
      appended: true,
      sheetName: "Sheet1",
      updatedRows: 1,
      rowValues: ["2026-10-12T12:00:00.000Z", "USER_SIGNUP", "User alex@company.com joined workspace Beta-1", "SUCCESS"],
    },
    definition: {
      name: "05 — Google Sheets Logger",
      description: "Logs timestamped workflow activity directly to a designated Google Sheet.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 120, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Manual Trigger",
            description: "Trigger log event",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-sheets-1",
          type: "neuraloop-node",
          position: { x: 480, y: 160 },
          data: {
            definitionId: "google-sheets",
            label: "Append Row to Sheets",
            description: "Appends timestamp and demo log to spreadsheet",
            category: "action",
            config: {
              credentialId: "",
              spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
              sheetName: "Sheet1",
              range: "A1:Z100",
              operation: "append_row",
              rowValues: "[\"{{timestamp}}\", \"{{input.eventType}}\", \"{{input.message}}\", \"SUCCESS\"]",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-sheets-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 06 — API-to-Sheets Pipeline
  // ==========================================================================
  {
    id: "starter-06-api-to-sheets-pipeline",
    number: "06",
    name: "06 — API-to-Sheets Pipeline",
    shortName: "API-to-Sheets Pipeline",
    description: "Extract data from a public REST API, transform and format the payload, and load the clean records into Google Sheets.",
    difficulty: "Advanced",
    difficultyOrder: 6,
    category: "ETL & Pipelines",
    icon: "Workflow",
    tags: ["etl", "pipeline", "http", "transform", "google-sheets"],
    flowSequence: ["Manual Trigger", "HTTP Request", "Transform", "Google Sheets"],
    credentialRequirements: [
      {
        provider: "google-sheets-service-account",
        name: "Google Sheets",
        description: "Google Cloud Service Account or OAuth credential to append data.",
        required: true,
      },
    ],
    checklist: [
      "Review the HTTP Request node fetching quotes from public API.",
      "Review the Transform node formatting columns into a row array.",
      "Attach your Google Sheets credential to the Google Sheets node.",
      "Enter your target Google Spreadsheet ID and click 'Run'.",
    ],
    exampleInput: {},
    expectedOutput: {
      pipelineSuccess: true,
      transformedQuote: "Life isn’t about getting and having, it’s about giving and being.",
      appendedToSheet: true,
    },
    definition: {
      name: "06 — API-to-Sheets Pipeline",
      description: "ETL flow: queries REST API, reshapes data with Transform node, and writes to Google Sheets.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 80, y: 160 },
          data: {
            definitionId: "manual-trigger",
            label: "Pipeline Trigger",
            description: "Start data fetch & sync",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 380, y: 160 },
          data: {
            definitionId: "http-request",
            label: "Fetch Quote Data",
            description: "GET https://dummyjson.com/quotes/random",
            category: "action",
            config: {
              method: "GET",
              url: "https://dummyjson.com/quotes/random",
              authType: "none",
              credentialId: "",
              responseType: "json",
              responseKey: "quoteData",
              timeout: 10000,
              retryCount: 1,
              retryDelay: 1000,
            },
          },
        },
        {
          id: "node-transform-1",
          type: "neuraloop-node",
          position: { x: 680, y: 160 },
          data: {
            definitionId: "transform",
            label: "Format Row Data",
            description: "Prepares row array with timestamp",
            category: "logic",
            config: {
              operation: "add_field",
              key: "formattedRow",
              value: "[\"{{timestamp}}\", \"{{steps.node-http-1.data.quote}}\", \"{{steps.node-http-1.data.author}}\"]",
            },
          },
        },
        {
          id: "node-sheets-1",
          type: "neuraloop-node",
          position: { x: 980, y: 160 },
          data: {
            definitionId: "google-sheets",
            label: "Append to Google Sheets",
            description: "Logs transformed quote to spreadsheet",
            category: "action",
            config: {
              credentialId: "",
              spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
              sheetName: "Sheet1",
              range: "A1:Z100",
              operation: "append_row",
              rowValues: "{{steps.node-transform-1.formattedRow}}",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-http-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-2",
          source: "node-http-1",
          target: "node-transform-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-3",
          source: "node-transform-1",
          target: "node-sheets-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },

  // ==========================================================================
  // 07 — Smart AI Alert Router
  // ==========================================================================
  {
    id: "starter-07-smart-ai-alert-router",
    number: "07",
    name: "07 — Smart AI Alert Router",
    shortName: "Smart AI Alert Router",
    description: "Triage incidents using structured AI JSON classification. Routes urgent events to Telegram and standard notices to Email.",
    difficulty: "Advanced",
    difficultyOrder: 7,
    category: "AI & Logic",
    icon: "GitBranch",
    tags: ["ai", "if", "branching", "routing", "telegram", "email"],
    flowSequence: ["Manual Trigger", "AI Agent", "IF Condition", "Telegram (True) / Email (False)"],
    credentialRequirements: [
      {
        provider: "openai",
        name: "AI Provider",
        description: "API key for JSON classification prompt.",
        required: true,
      },
      {
        provider: "telegram",
        name: "Telegram Bot",
        description: "Bot token for urgent incident broadcast.",
        required: true,
      },
      {
        provider: "smtp",
        name: "SMTP Email",
        description: "SMTP credentials for non-urgent digest notifications.",
        required: true,
      },
    ],
    checklist: [
      "Attach AI Provider credential to AI Urgency Classifier node.",
      "Attach Telegram Bot credential and Chat ID to Urgent Telegram Alert node.",
      "Attach SMTP credential to Standard Email Notification node.",
      "Run with sample urgent text to verify the True (Telegram) branch triggers.",
      "Run with routine inquiry to verify the False (Email) branch triggers.",
    ],
    exampleInput: {
      incidentReport: "Payment gateway experiencing 45% timeout error rate on US-East checkout cluster.",
      chatId: "-1001234567890",
    },
    expectedOutput: {
      triageDecision: "urgent",
      routedTo: "telegram",
      skipped: "email",
    },
    definition: {
      name: "07 — Smart AI Alert Router",
      description: "Classifies incident urgency via AI and conditionally branches to Telegram or Email.",
      status: "published",
      nodes: [
        {
          id: "node-trigger-1",
          type: "neuraloop-node",
          position: { x: 80, y: 200 },
          data: {
            definitionId: "manual-trigger",
            label: "Incident Report Trigger",
            description: "Submits event for AI evaluation",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 380, y: 200 },
          data: {
            definitionId: "ai",
            label: "AI Urgency Classifier",
            description: "Classifies severity and returns JSON",
            category: "action",
            config: {
              provider: "openai",
              credentialId: "",
              model: "gpt-4o-mini",
              systemPrompt: "You are an incident triaging AI. Analyze the input incident text and classify whether it is urgent. Output ONLY valid JSON in this format: {\"isUrgent\": true, \"summary\": \"string\", \"recommendedAction\": \"string\"}",
              prompt: "Analyze this incident report and classify urgency: {{input.incidentReport}}",
              responseType: "json",
              temperature: 0.2,
              maxTokens: 250,
            },
          },
        },
        {
          id: "node-if-1",
          type: "neuraloop-node",
          position: { x: 680, y: 200 },
          data: {
            definitionId: "if",
            label: "Is Urgent Incident?",
            description: "Routes urgent to Telegram, non-urgent to Email",
            category: "logic",
            config: {
              condition: {
                field: "steps.node-ai-1.json.isUrgent",
                operator: "is_true",
                value: "true",
                secondValue: "",
                dataType: "boolean",
                mode: "basic",
                expression: "",
              },
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 980, y: 100 },
          data: {
            definitionId: "telegram",
            label: "Urgent Telegram Alert",
            description: "Immediate dispatch for high-priority incidents",
            category: "action",
            config: {
              credentialId: "",
              chatId: "{{input.chatId}}",
              operation: "send_message",
              text: "🚨 *URGENT INCIDENT DETECTED*\n\n*Summary:* {{steps.node-ai-1.json.summary}}\n*Action:* {{steps.node-ai-1.json.recommendedAction}}",
            },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 980, y: 300 },
          data: {
            definitionId: "email",
            label: "Standard Email Notification",
            description: "Routine digest for non-urgent notices",
            category: "action",
            config: {
              credentialId: "",
              to: "team@example.com",
              cc: "",
              bcc: "",
              subject: "[Notice] Routine Incident: {{steps.node-ai-1.json.summary}}",
              body: "Hello Team,\n\nThe AI triage classifier categorized an incident as non-urgent.\n\nSummary: {{steps.node-ai-1.json.summary}}\nRecommended Action: {{steps.node-ai-1.json.recommendedAction}}\n\nNo immediate intervention required.",
            },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-ai-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-2",
          source: "node-ai-1",
          target: "node-if-1",
          sourceHandle: "out",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-3",
          source: "node-if-1",
          target: "node-telegram-1",
          sourceHandle: "true",
          targetHandle: "in",
          type: "smoothstep",
        },
        {
          id: "edge-4",
          source: "node-if-1",
          target: "node-email-1",
          sourceHandle: "false",
          targetHandle: "in",
          type: "smoothstep",
        },
      ],
    },
  },
];

export const STARTER_TEMPLATE_IDS = STARTER_TEMPLATES.map((t) => t.id);

/**
 * Validates all starter template definitions against the official node config Zod schemas.
 * Throws an informative error if any starter contains schema mismatches.
 */
export function validateAllStarterTemplates(): void {
  for (const starter of STARTER_TEMPLATES) {
    for (const node of starter.definition.nodes) {
      const defId = node.data.definitionId;
      const result = validateNodeConfig(defId, node.data.config);
      if (!result.success) {
        throw new Error(
          `Starter template "${starter.id}" node "${node.id}" (${defId}) failed config validation: ${result.error?.message}`,
        );
      }
    }
  }
}

export const LEGACY_STARTER_IDS = [
  "starter-03-ai-to-telegram-assistant",
  "starter-04-automated-email-alert",
];

/**
 * Normalizes a database WorkflowTemplate record into a fully typed StarterTemplateItem.
 */
export function formatStarterTemplateRecord(
  record: import("@prisma/client").WorkflowTemplate,
): StarterTemplateItem {
  const def = (record.definition as Record<string, unknown>) || {};
  const fallback = STARTER_TEMPLATES.find((s) => s.id === record.id);

  return {
    id: record.id,
    number: (def.starterNumber as string) || fallback?.number || record.name.slice(0, 2),
    name: record.name,
    shortName: fallback?.shortName || record.name.replace(/^\d+\s*[—–-]\s*/, ""),
    description: record.description,
    difficulty:
      (def.difficulty as "Beginner" | "Intermediate" | "Advanced") ||
      fallback?.difficulty ||
      "Beginner",
    difficultyOrder: (def.difficultyOrder as number) || fallback?.difficultyOrder || 1,
    category: record.category,
    icon: record.icon || fallback?.icon || "Workflow",
    tags: Array.isArray(record.tags)
      ? (record.tags as string[])
      : fallback?.tags || [],
    credentialRequirements:
      (def.credentialRequirements as StarterCredentialRequirement[]) ||
      fallback?.credentialRequirements ||
      [],
    flowSequence: (def.flowSequence as string[]) || fallback?.flowSequence || [],
    checklist: (def.checklist as string[]) || fallback?.checklist || [],
    exampleInput: (def.exampleInput as Record<string, unknown>) || fallback?.exampleInput || {},
    expectedOutput: (def.expectedOutput as Record<string, unknown>) || fallback?.expectedOutput || {},
    definition: {
      name: record.name,
      description: record.description,
      status: "published",
      nodes: (def.nodes as WorkflowNode[]) || fallback?.definition.nodes || [],
      edges: (def.edges as WorkflowEdge[]) || fallback?.definition.edges || [],
    },
  };
}

/**
 * Idempotently seeds the 7 canonical starter workflows into the Prisma database.
 */
export async function seedStarterTemplates(): Promise<void> {
  validateAllStarterTemplates();

  // Clean up legacy starter IDs to avoid duplicates in the database
  try {
    await prisma.workflowTemplate.deleteMany({
      where: { id: { in: LEGACY_STARTER_IDS } },
    });
  } catch (err) {
    console.warn("Legacy starter cleanup notice:", err);
  }

  for (const starter of STARTER_TEMPLATES) {
    const fullDefinition = {
      ...starter.definition,
      starterNumber: starter.number,
      difficulty: starter.difficulty,
      difficultyOrder: starter.difficultyOrder,
      credentialRequirements: starter.credentialRequirements,
      flowSequence: starter.flowSequence,
      checklist: starter.checklist,
      exampleInput: starter.exampleInput,
      expectedOutput: starter.expectedOutput,
    };

    await prisma.workflowTemplate.upsert({
      where: { id: starter.id },
      update: {
        name: starter.name,
        description: starter.description,
        category: starter.category,
        icon: starter.icon,
        tags: starter.tags,
        featured: true,
        isOfficial: true,
        isPublic: true,
        userId: null,
        organizationId: null,
        definition: fullDefinition as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
      create: {
        id: starter.id,
        name: starter.name,
        description: starter.description,
        category: starter.category,
        icon: starter.icon,
        tags: starter.tags,
        featured: true,
        isOfficial: true,
        isPublic: true,
        userId: null,
        organizationId: null,
        definition: fullDefinition as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });
  }
}
