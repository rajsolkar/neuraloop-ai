import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const INITIAL_TEMPLATES = [
  // 1. Daily AI Summary
  {
    name: "Daily AI Summary",
    description: "Scheduled morning trigger that asks AI for daily productivity tips and broadcasts them directly to a Telegram channel.",
    category: "AI",
    icon: "Send",
    tags: ["telegram", "ai", "schedule", "productivity"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Daily AI Summary",
      description: "Daily scheduled AI productivity tip broadcast to Telegram",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 8 AM Schedule",
            description: "Triggers every morning at 8:00 AM UTC",
            category: "trigger",
            config: { cron: "0 8 * * *", preset: "daily", time: "08:00" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "Generate Daily Tip",
            description: "Queries AI model for actionable productivity tip",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Give me one actionable, high-impact productivity tip for workflow automation.",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "telegram",
            label: "Broadcast to Telegram",
            description: "Sends productivity tip to Telegram chat",
            category: "action",
            config: {
              chatId: "@my_productivity_channel",
              message: "💡 **Daily Automation Tip**:\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-telegram-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 2. Discord AI News Bot
  {
    name: "Discord AI News Bot",
    description: "Scheduled bot that queries AI for daily news digests and posts rich embeds to a Discord channel via Webhook.",
    category: "AI",
    icon: "MessageSquare",
    tags: ["discord", "ai", "schedule", "bot"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Discord AI News Bot",
      description: "Scheduled AI news summary broadcasted to Discord via Webhook",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 9 AM Schedule",
            description: "Triggers every morning at 9:00 AM UTC",
            category: "trigger",
            config: { cron: "0 9 * * *", preset: "daily", time: "09:00" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "Generate Tech Summary",
            description: "Generates bullet points of daily tech headlines",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Provide 3 concise bullet points summarizing today's tech and AI news.",
            },
          },
        },
        {
          id: "node-discord-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "discord",
            label: "Post to Discord Channel",
            description: "Sends message to Discord webhook",
            category: "action",
            config: {
              messageType: "embed",
              content: "🤖 **Daily AI & Tech Digest**",
              embedTitle: "Today's Top Tech Stories",
              embedDescription: "{{steps.node-ai-1.output.text}}",
              embedColor: 3447003,
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-discord-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 3. Google Sheets AI Analyzer
  {
    name: "Google Sheets AI Analyzer",
    description: "Read row data from Google Sheets, run sentiment or classification analysis with AI, and append results back to Google Sheets.",
    category: "Productivity",
    icon: "Table",
    tags: ["google-sheets", "ai", "data", "analytics"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Google Sheets AI Analyzer",
      description: "Reads sheet rows, processes text via AI, and appends output to results spreadsheet",
      status: "published",
      nodes: [
        {
          id: "node-gsheets-read",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Read Customer Feedback Rows",
            description: "Fetches rows from spreadsheet range A1:C50",
            category: "action",
            config: {
              operation: "read_rows",
              spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
              range: "Feedback!A1:C50",
            },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "Classify Sentiment",
            description: "Analyzes sentiment of customer feedback",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Analyze the sentiment of this customer feedback list and summarize findings:\n{{steps.node-gsheets-read.output.values}}",
            },
          },
        },
        {
          id: "node-gsheets-append",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Append Sentiment Summary",
            description: "Appends summary analysis row to sheet",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
              range: "AnalysisResults!A:B",
              valuesJson: "[[\"Summary Analysis\", \"{{steps.node-ai-1.output.text}}\"]]",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-gsheets-read", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-gsheets-append", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 4. Contact Form Tracker
  {
    name: "Contact Form Tracker",
    description: "Capture website form submissions via incoming webhooks, normalize lead fields, and append records into Google Sheets.",
    category: "Sales",
    icon: "Table",
    tags: ["google-sheets", "webhook", "transform", "leads", "sales"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Contact Form Tracker",
      description: "Ingests form data via webhook, normalizes fields with Transform, and logs entries into Google Sheets",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Form Submission Webhook",
            description: "Ingests payload from website contact form",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-transform-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "transform",
            label: "Normalize Lead Payload",
            description: "Applies default values to optional form input fields",
            category: "logic",
            config: {
              operation: "set_default_values",
              defaults: { name: "Anonymous Lead", email: "no-email@example.com", message: "No message" },
            },
          },
        },
        {
          id: "node-gsheets-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Append Lead to Sheet",
            description: "Appends lead row (Name, Email, Message) to Google Sheet",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "Leads!A:C",
              valuesJson: "[[\"{{steps.node-transform-1.output.result.name}}\", \"{{steps.node-transform-1.output.result.email}}\", \"{{steps.node-transform-1.output.result.message}}\"]]",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-transform-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-transform-1", target: "node-gsheets-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 5. Telegram Alert System
  {
    name: "Telegram Alert System",
    description: "Receive incoming webhooks or alerts and instantly route message notifications to a Telegram chat or channel.",
    category: "Communication",
    icon: "Send",
    tags: ["telegram", "webhook", "alerts", "communication"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Telegram Alert System",
      description: "Webhook trigger to Telegram bot notification alert",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Inbound Alert Webhook",
            description: "Ingests incoming alert event payloads",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "telegram",
            label: "Send Telegram Alert",
            description: "Dispatches formatted alert message via Telegram Bot API",
            category: "action",
            config: {
              chatId: "{{input.chat_id}}",
              message: "🚨 **Incoming Alert**:\n{{input.message}}",
              parseMode: "Markdown",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-telegram-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 6. AI Email Digest Generator
  {
    name: "AI Email Digest Generator",
    description: "Fetches content feed via HTTP GET, formats payload with Transform, generates an executive summary using AI, and emails subscribers.",
    category: "AI",
    icon: "Mail",
    tags: ["ai", "email", "transform", "http-request", "schedule"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Email Digest Generator",
      description: "Scheduled HTTP payload processing with Transform & AI emailed to subscribers",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 8 AM Schedule",
            description: "Triggers every morning at 8:00 AM UTC",
            category: "trigger",
            config: { cron: "0 8 * * *", preset: "daily", time: "08:00" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 350, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Fetch News Feed",
            description: "Fetches target JSON content feed",
            category: "action",
            config: { method: "GET", url: "https://api.github.com/zen" },
          },
        },
        {
          id: "node-transform-1",
          type: "neuraloop-node",
          position: { x: 600, y: 150 },
          data: {
            definitionId: "transform",
            label: "Trim & Format Content",
            description: "Trims whitespace and formats feed payload",
            category: "logic",
            config: {
              operation: "string_format",
              stringAction: "trim",
              sourcePath: "body",
            },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 850, y: 150 },
          data: {
            definitionId: "ai",
            label: "Generate AI Digest",
            description: "Synthesizes content feed into executive briefing",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Synthesize the following content feed into an executive briefing digest:\n{{steps.node-transform-1.output.result}}",
            },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 1100, y: 150 },
          data: {
            definitionId: "email",
            label: "Email Executive Digest",
            description: "Emails formatted briefing to executive list",
            category: "action",
            config: {
              to: "subscribers@company.com",
              subject: "📰 Daily AI Executive Briefing",
              body: "Here is today's summary briefing:\n\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-transform-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-transform-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-4-5", source: "node-ai-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 7. AI Lead Qualification Bot
  {
    name: "AI Lead Qualification Bot",
    description: "Ingests incoming leads via webhook, normalizes defaults with Transform, evaluates intent and budget using AI, and routes qualified leads to Telegram or logs them in Google Sheets.",
    category: "Sales",
    icon: "Bot",
    tags: ["sales", "ai", "transform", "switch", "telegram", "google-sheets"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Lead Qualification Bot",
      description: "Automated incoming lead scoring and multi-channel routing with Transform field normalization",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Inbound Lead Webhook",
            description: "Captures lead submission payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-transform-1",
          type: "neuraloop-node",
          position: { x: 350, y: 150 },
          data: {
            definitionId: "transform",
            label: "Normalize Lead Attributes",
            description: "Ensures default fallback values for lead fields",
            category: "logic",
            config: {
              operation: "set_default_values",
              defaults: { company: "Self-Employed", budget: "Unknown" },
            },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 600, y: 150 },
          data: {
            definitionId: "ai",
            label: "Score & Qualify Lead",
            description: "Evaluates budget and intent (HIGH vs LOW)",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Classify lead priority tier as HIGH or LOW based on submission:\nName: {{input.name}}\nCompany: {{steps.node-transform-1.output.result.company}}\nMessage: {{input.message}}",
            },
          },
        },
        {
          id: "node-switch-1",
          type: "neuraloop-node",
          position: { x: 850, y: 150 },
          data: {
            definitionId: "switch",
            label: "Route Priority Tier",
            description: "Routes HIGH tier to Telegram, others to Sheets",
            category: "logic",
            config: {
              cases: [
                { id: "case_1", label: "High Priority", fieldPath: "text", operator: "contains", value: "HIGH" },
              ],
              defaultHandle: "default",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 1150, y: 100 },
          data: {
            definitionId: "telegram",
            label: "Urgent Sales Alert",
            description: "Fires instant Telegram message to sales leads channel",
            category: "action",
            config: {
              chatId: "@sales_hot_leads",
              message: "🔥 **HIGH PRIORITY LEAD QUALIFIED!**\n- Name: {{input.name}}\n- Company: {{steps.node-transform-1.output.result.company}}\n- AI Evaluation: {{steps.node-ai-1.output.text}}",
            },
          },
        },
        {
          id: "node-gsheets-1",
          type: "neuraloop-node",
          position: { x: 1150, y: 250 },
          data: {
            definitionId: "google-sheets",
            label: "Log Standard Lead",
            description: "Logs standard leads into Google Sheets pipeline",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "Leads!A:D",
              valuesJson: "[[\"{{input.name}}\", \"{{steps.node-transform-1.output.result.company}}\", \"{{input.email}}\", \"{{steps.node-ai-1.output.text}}\"]]",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-transform-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-transform-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-ai-1", target: "node-switch-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-4-5", source: "node-switch-1", target: "node-telegram-1", sourceHandle: "case_1", targetHandle: "in" },
        { id: "edge-4-6", source: "node-switch-1", target: "node-gsheets-1", sourceHandle: "default", targetHandle: "in" },
      ],
    },
  },

  // 8. AI Support Ticket Router
  {
    name: "AI Support Ticket Router",
    description: "Analyzes customer support ticket text with AI, classifies urgency/category, and routes to appropriate branch queues.",
    category: "Customer Support",
    icon: "GitBranch",
    tags: ["support", "ai", "switch", "webhook"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Support Ticket Router",
      description: "Real-time AI support ticket triage and dynamic branch routing",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Ticket Ingestion Webhook",
            description: "Ingests support ticket payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "Classify Urgency",
            description: "Determines queue category (URGENT, BILLING, GENERAL)",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Classify support ticket category as URGENT, BILLING, or GENERAL for:\nSubject: {{input.subject}}\nBody: {{input.body}}",
            },
          },
        },
        {
          id: "node-switch-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "switch",
            label: "Branch Queue Router",
            description: "Routes ticket based on AI classification label",
            category: "logic",
            config: {
              cases: [
                { id: "case_1", label: "Urgent Escalation", fieldPath: "text", operator: "contains", value: "URGENT" },
                { id: "case_2", label: "Billing Team", fieldPath: "text", operator: "contains", value: "BILLING" },
              ],
              defaultHandle: "default",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-switch-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 9. Competitor Monitoring Agent
  {
    name: "Competitor Monitoring Agent",
    description: "Periodically inspects competitor landing page content via HTTP GET, detects changes using AI, and alerts your team on Discord.",
    category: "Operations",
    icon: "Globe",
    tags: ["monitoring", "http-request", "ai", "discord"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Competitor Monitoring Agent",
      description: "Automated HTTP webpage monitoring and AI intelligence summaries on Discord",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily Check Schedule",
            description: "Runs monitor check daily at 12:00 PM UTC",
            category: "trigger",
            config: { cron: "0 12 * * *", preset: "daily", time: "12:00" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Fetch Competitor Site",
            description: "Downloads current competitor HTML/JSON page content",
            category: "action",
            config: { method: "GET", url: "https://api.github.com/zen" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "ai",
            label: "Extract Market Insights",
            description: "Analyzes webpage update for pricing or feature announcements",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Analyze this webpage update payload for new product announcements or pricing shifts:\n{{steps.node-http-1.output.body}}",
            },
          },
        },
        {
          id: "node-discord-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 150 },
          data: {
            definitionId: "discord",
            label: "Alert Discord Channel",
            description: "Posts rich intelligence embed to Discord webhook",
            category: "action",
            config: {
              messageType: "embed",
              content: "🔍 **Competitor Intelligence Update**",
              embedTitle: "Market Monitor Report",
              embedDescription: "{{steps.node-ai-1.output.text}}",
              embedColor: 15158332,
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-ai-1", target: "node-discord-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 10. AI Social Media Content Factory
  {
    name: "AI Social Media Content Factory",
    description: "Generates weekly social media content variations using AI, loops through output posts, and archives drafts into Google Sheets.",
    category: "Marketing",
    icon: "Sparkles",
    tags: ["marketing", "ai", "loop", "google-sheets"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Social Media Content Factory",
      description: "Scheduled AI post generation looped into Google Sheets content calendar",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Monday Morning Schedule",
            description: "Triggers every Monday at 10:00 AM UTC",
            category: "trigger",
            config: { cron: "0 10 * * 1", preset: "weekly", time: "10:00" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "ai",
            label: "Draft Weekly Social Posts",
            description: "Generates list of engaging social post drafts",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Generate 3 high-engaging social media post ideas for tech founders as bullet points.",
            },
          },
        },
        {
          id: "node-loop-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "loop",
            label: "Iterate Drafts",
            description: "Loops over generated post array elements",
            category: "logic",
            config: {
              arrayInput: ["Post Draft 1: How to automate workflows", "Post Draft 2: Why BYOK matters", "Post Draft 3: Scaling AI agents"],
            },
          },
        },
        {
          id: "node-gsheets-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Archive Draft to Calendar",
            description: "Appends draft item to Google Sheets content calendar",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "ContentCalendar!A:B",
              valuesJson: "[[\"Draft Item\", \"{{steps.node-loop-1.output.item}}\"]]",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-loop-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-loop-1", target: "node-gsheets-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 11. Website Uptime Monitor
  {
    name: "Website Uptime Monitor",
    description: "Pings server endpoint every 5 minutes, checks HTTP response code with Switch condition logic, and fires urgent Telegram downtime alerts.",
    category: "Operations",
    icon: "Globe",
    tags: ["monitoring", "uptime", "http-request", "telegram"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Website Uptime Monitor",
      description: "Automated HTTP ping monitor with conditional Telegram downtime alerting",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Every 5 Minutes",
            description: "Triggers check every 5 minutes",
            category: "trigger",
            config: { cron: "*/5 * * * *", preset: "cron" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Ping Target Server",
            description: "Executes HTTP GET ping check",
            category: "action",
            config: { method: "GET", url: "https://httpbin.org/status/200" },
          },
        },
        {
          id: "node-switch-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "switch",
            label: "Check Status == 200",
            description: "Evaluates whether response status code is 200 OK",
            category: "logic",
            config: {
              cases: [
                { id: "case_1", label: "Server Healthy", fieldPath: "status", operator: "equals", value: "200" },
              ],
              defaultHandle: "default",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 250 },
          data: {
            definitionId: "telegram",
            label: "Send Downtime Alert",
            description: "Fires Telegram alert when server is non-responsive",
            category: "action",
            config: {
              chatId: "@devops_alerts",
              message: "🚨 **CRITICAL DOWNTIME ALERT**: Target site ping returned HTTP status {{steps.node-http-1.output.status}}!",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-switch-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-switch-1", target: "node-telegram-1", sourceHandle: "default", targetHandle: "in" },
      ],
    },
  },

  // 12. AI Meeting Notes Distributor
  {
    name: "AI Meeting Notes Distributor",
    description: "Receives raw meeting transcripts via webhook, synthesizes action items using AI, merges summary streams, and distributes to Email & Discord.",
    category: "Productivity",
    icon: "Users",
    tags: ["productivity", "ai", "merge", "email", "discord"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Meeting Notes Distributor",
      description: "Automated meeting transcript summarization with multi-channel distribution",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Transcript Webhook",
            description: "Ingests raw meeting transcript text",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "ai",
            label: "Extract Action Items",
            description: "Synthesizes transcript into clear action items and decisions",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Summarize meeting transcript into Action Items and Key Decisions:\n{{input.transcript}}",
            },
          },
        },
        {
          id: "node-merge-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "merge",
            label: "Consolidate Notes Payload",
            description: "Consolidates summary output streams",
            category: "logic",
            config: { mode: "combine" },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 100 },
          data: {
            definitionId: "email",
            label: "Email Team Notes",
            description: "Emails formatted meeting notes to team inbox",
            category: "action",
            config: {
              to: "team@company.com",
              subject: "📝 Executive Meeting Notes & Action Items",
              body: "Here are the key takeaways from today's meeting:\n\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
        {
          id: "node-discord-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 250 },
          data: {
            definitionId: "discord",
            label: "Post to Discord Channel",
            description: "Broadcasts notes overview to Discord channel",
            category: "action",
            config: {
              messageType: "content",
              content: "📝 **Meeting Notes Published**:\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-merge-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-merge-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-5", source: "node-merge-1", target: "node-discord-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 13. AI Research Assistant
  {
    name: "AI Research Assistant",
    description: "Reads company research topics from Google Sheets, flattens & filters topics with Transform, iterates over rows with Loop, researches insights using AI, and writes results back.",
    category: "Productivity",
    icon: "Table",
    tags: ["google-sheets", "transform", "loop", "ai", "research"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "AI Research Assistant",
      description: "Batch topic processing loop with Transform & AI research synthesis in Google Sheets",
      status: "published",
      nodes: [
        {
          id: "node-gsheets-read",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Read Topic List",
            description: "Fetches topic rows from spreadsheet range Topics!A1:A20",
            category: "action",
            config: {
              operation: "read_rows",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "Topics!A1:A20",
            },
          },
        },
        {
          id: "node-transform-1",
          type: "neuraloop-node",
          position: { x: 350, y: 150 },
          data: {
            definitionId: "transform",
            label: "Flatten Topic Rows",
            description: "Flattens sheet row matrix into single array for iteration",
            category: "logic",
            config: {
              operation: "flatten_json",
              sourcePath: "values",
            },
          },
        },
        {
          id: "node-loop-1",
          type: "neuraloop-node",
          position: { x: 600, y: 150 },
          data: {
            definitionId: "loop",
            label: "Loop Over Topics",
            description: "Iterates over topic array rows",
            category: "logic",
            config: { arrayPath: "result" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 850, y: 150 },
          data: {
            definitionId: "ai",
            label: "AI Deep Dive Research",
            description: "Generates key research bullet points for active topic",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Provide 3 concise, high-impact research insights for topic: {{steps.node-loop-1.output.item}}",
            },
          },
        },
        {
          id: "node-gsheets-write",
          type: "neuraloop-node",
          position: { x: 1100, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Write Research Results",
            description: "Appends research findings back to spreadsheet",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "ResearchResults!A:B",
              valuesJson: "[[\"{{steps.node-loop-1.output.item}}\", \"{{steps.node-ai-1.output.text}}\"]]",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-gsheets-read", target: "node-transform-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-transform-1", target: "node-loop-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-loop-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-4-5", source: "node-ai-1", target: "node-gsheets-write", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 14. Smart Job Application Tracker
  {
    name: "Smart Job Application Tracker",
    description: "Ingests incoming job applications via webhook, formats application data with Set Variable, logs to Google Sheets, and alerts hiring manager on Telegram.",
    category: "HR",
    icon: "Users",
    tags: ["hr", "webhook", "set-variable", "google-sheets", "telegram"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Smart Job Application Tracker",
      description: "Automated candidate application ingestion, variable tagging, and hiring alert",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Application Webhook",
            description: "Ingests job application submission payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-set-var-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "set-variable",
            label: "Tag Candidate Status",
            description: "Applies candidate status tag UNDER_REVIEW",
            category: "logic",
            config: {
              variables: [
                { name: "candidate_status", value: "UNDER_REVIEW" },
              ],
            },
          },
        },
        {
          id: "node-gsheets-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "google-sheets",
            label: "Log Candidate to Sheet",
            description: "Logs applicant details to Google Sheets database",
            category: "action",
            config: {
              operation: "append_row",
              spreadsheetId: "YOUR_SPREADSHEET_ID",
              range: "Applications!A:D",
              valuesJson: "[[\"{{input.name}}\", \"{{input.email}}\", \"{{input.role}}\", \"{{steps.node-set-var-1.output.candidate_status}}\"]]",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 150 },
          data: {
            definitionId: "telegram",
            label: "Alert Hiring Manager",
            description: "Notifies hiring team chat on Telegram",
            category: "action",
            config: {
              chatId: "@hr_hiring_team",
              message: "👤 **New Job Application Submitted!**\n- Candidate: {{input.name}}\n- Role: {{input.role}}\n- Status: {{steps.node-set-var-1.output.candidate_status}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-set-var-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-set-var-1", target: "node-gsheets-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-gsheets-1", target: "node-telegram-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 15. Content Approval Workflow
  {
    name: "Content Approval Workflow",
    description: "Receives draft articles via webhook, runs AI quality checks, and routes content to Approval or Revision handles.",
    category: "Marketing",
    icon: "GitBranch",
    tags: ["marketing", "ai", "switch", "webhook"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Content Approval Workflow",
      description: "Automated AI content quality audit and approval branch routing",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Draft Content Webhook",
            description: "Ingests draft article payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "AI Quality Audit",
            description: "Evaluates draft quality and outputs APPROVED or REVISION",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Audit this draft article for clarity, tone, and grammar. Output verdict 'APPROVED' or 'REVISION_NEEDED':\n{{input.draft}}",
            },
          },
        },
        {
          id: "node-switch-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "switch",
            label: "Route Approval Verdict",
            description: "Routes approved content vs revision needed branch",
            category: "logic",
            config: {
              cases: [
                { id: "case_1", label: "Approved Path", fieldPath: "text", operator: "contains", value: "APPROVED" },
              ],
              defaultHandle: "default",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-switch-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 16. GitHub PR Reviewer (OAuth)
  {
    name: "GitHub PR Reviewer",
    description: "Captures GitHub pull_request webhook events, fetches diff payload via GitHub OAuth, analyzes code quality using AI, and posts review summary to Slack.",
    category: "Developer Tools",
    icon: "GitBranch",
    tags: ["github", "oauth", "ai", "slack"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "GitHub PR Reviewer",
      description: "Automated AI pull request code reviewer with GitHub OAuth integration",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "GitHub PR Webhook",
            description: "Captures pull request event payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Fetch PR Diff Payload",
            description: "Queries GitHub API using GitHub OAuth connection",
            category: "action",
            config: {
              method: "GET",
              url: "https://api.github.com/repos/{{input.repository.full_name}}/pulls/{{input.pull_request.number}}",
              authType: "oauth_connection",
              connectionProvider: "github",
              responseKey: "prData",
            },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "ai",
            label: "AI Code Review",
            description: "Analyzes pull request changes for bugs & improvements",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Review PR #{{input.pull_request.number}}: {{steps.node-http-1.output.prData.title}}\nDescription: {{steps.node-http-1.output.prData.body}}\nProvide 3 key suggestions.",
            },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 150 },
          data: {
            definitionId: "slack",
            label: "Post Review to Slack",
            description: "Posts AI PR review findings to dev channel",
            category: "action",
            config: {
              channel: "#code-reviews",
              message: "🐙 **GitHub PR #{{input.pull_request.number}} AI Review**\n\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-ai-1", target: "node-slack-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 17. GitHub Issue Summarizer
  {
    name: "GitHub Issue Summarizer",
    description: "Ingests GitHub issue webhooks, summarizes customer bug reports using AI, and broadcasts findings to a Telegram channel.",
    category: "Developer Tools",
    icon: "GitBranch",
    tags: ["github", "oauth", "ai", "telegram"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "GitHub Issue Summarizer",
      description: "Automated GitHub issue triage and Telegram broadcast",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "GitHub Issue Webhook",
            description: "Captures issue payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "ai",
            label: "Summarize Issue Severity",
            description: "Summarizes issue body and rates severity",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Summarize issue '{{input.issue.title}}': {{input.issue.body}}. Rate priority as High, Medium, or Low.",
            },
          },
        },
        {
          id: "node-telegram-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "telegram",
            label: "Broadcast to Telegram",
            description: "Sends issue summary to dev chat",
            category: "action",
            config: {
              chatId: "@dev_issues_alerts",
              message: "🐛 **New GitHub Issue Summarized**\n\n{{steps.node-ai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-telegram-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },

  // 18. Slack Incident Monitor
  {
    name: "Slack Incident Monitor",
    description: "Monitors incident alert webhooks, generates an executive incident triage brief with AI, and posts to Slack using Slack OAuth Connection.",
    category: "Operations",
    icon: "MessageSquare",
    tags: ["slack", "oauth", "ai", "monitoring"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Slack Incident Monitor",
      description: "Automated Slack incident response and AI executive triage briefing",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Incident Alert Webhook",
            description: "Captures system outage payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-ai-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "ai",
            label: "Draft Incident Briefing",
            description: "Generates executive triage summary",
            category: "action",
            config: {
              provider: "openai",
              model: "gpt-4o-mini",
              prompt: "Draft an executive incident triage summary for outage: {{input.service}} - {{input.error}}",
            },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Post via Slack OAuth",
            description: "Dispatches incident alert via Slack OAuth API",
            category: "action",
            config: {
              method: "POST",
              url: "https://slack.com/api/chat.postMessage",
              authType: "oauth_connection",
              connectionProvider: "slack",
              bodyType: "json",
              body: '{\n  "channel": "#incidents",\n  "text": "🚨 **INCIDENT TRIAGE BRIEFING**:\\n{{steps.node-ai-1.output.text}}"\n}',
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-ai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-ai-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
];

export async function seedTemplates() {
  console.log("Seeding official Neuraloop templates...");

  // Purge outdated official templates that were removed in the refresh
  const activeTemplateNames = INITIAL_TEMPLATES.map((t) => t.name);
  await prisma.workflowTemplate.deleteMany({
    where: {
      isOfficial: true,
      name: { notIn: activeTemplateNames },
    },
  });

  let seededCount = 0;
  for (const tpl of INITIAL_TEMPLATES) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { name: tpl.name, isOfficial: true },
    });

    if (existing) {
      await prisma.workflowTemplate.update({
        where: { id: existing.id },
        data: {
          description: tpl.description,
          category: tpl.category,
          icon: tpl.icon,
          tags: tpl.tags,
          featured: tpl.featured,
          isOfficial: tpl.isOfficial,
          isPublic: tpl.isPublic,
          definition: tpl.definition,
        },
      });
    } else {
      await prisma.workflowTemplate.create({
        data: {
          name: tpl.name,
          description: tpl.description,
          category: tpl.category,
          icon: tpl.icon,
          tags: tpl.tags,
          featured: tpl.featured,
          isOfficial: tpl.isOfficial,
          isPublic: tpl.isPublic,
          definition: tpl.definition,
        },
      });
      seededCount++;
    }
  }

  console.log(`Successfully synced ${INITIAL_TEMPLATES.length} official templates (${seededCount} newly created).`);
}

if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding templates:", err);
      process.exit(1);
    });
}
