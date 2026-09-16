import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const INITIAL_TEMPLATES = [
  {
    name: "Daily AI News Digest",
    description: "Fetches tech news, generates an AI summary using OpenAI GPT-4o-mini, and sends a daily digest to Slack.",
    category: "AI",
    icon: "Bot",
    tags: ["ai", "news", "slack", "schedule"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Daily AI News Digest",
      description: "Automated daily AI news curation and Slack broadcast",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 8 AM Trigger",
            description: "Runs every day at 8:00 AM UTC",
            category: "trigger",
            config: { cron: "0 8 * * *", preset: "daily", time: "08:00" },
          },
        },
        {
          id: "node-openai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "openai",
            label: "Summarize AI Headlines",
            description: "Uses OpenAI GPT-4o-mini to summarize top news",
            category: "action",
            config: {
              model: "gpt-4o-mini",
              prompt: "Summarize the top 3 AI breakthroughs of the day in bullet points.",
              systemPrompt: "You are an executive tech summary assistant.",
            },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "slack",
            label: "Send to #ai-news Channel",
            description: "Posts digest summary into Slack channel",
            category: "action",
            config: { channel: "#ai-news", text: "📰 **Daily AI News Digest**:\n{{steps.node-openai-1.output.text}}" },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-openai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-openai-1", target: "node-slack-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "LinkedIn Post Generator",
    name_clean: "LinkedIn Post Generator",
    description: "Generate engaging professional posts from topic ideas using AI and send a review draft to your email.",
    category: "AI",
    icon: "Sparkles",
    tags: ["ai", "social-media", "email", "automation"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "LinkedIn Post Generator",
      description: "AI-powered draft creation for professional social media posts",
      status: "published",
      nodes: [
        {
          id: "node-manual-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "manual-trigger",
            label: "Manual Topic Trigger",
            description: "Trigger with a topic prompt input",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "node-openai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "openai",
            label: "Generate LinkedIn Post",
            description: "Draft post with hook, body, and relevant hashtags",
            category: "action",
            config: {
              model: "gpt-4o-mini",
              prompt: "Write a high-converting LinkedIn post about: {{input.topic}}",
            },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "email",
            label: "Email Draft to Creator",
            description: "Sends post preview for manual approval",
            category: "action",
            config: {
              to: "creator@example.com",
              subject: "LinkedIn Post Draft Ready for Review",
              body: "Here is your generated LinkedIn post:\n\n{{steps.node-openai-1.output.text}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-manual-1", target: "node-openai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-openai-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Blog Summarizer & Slack Broadcast",
    description: "Receive articles via incoming webhook, generate concise bulleted summaries, and alert your marketing team.",
    category: "AI",
    icon: "FileText",
    tags: ["ai", "content", "webhook", "slack"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Blog Summarizer & Slack Broadcast",
      description: "Summarizes blog post URLs and sends executive briefing to Slack",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Blog Webhook Trigger",
            description: "Receives blog post body or URL payload",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-openai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "openai",
            label: "AI Summarization",
            description: "Extract key takeaways and action items",
            category: "action",
            config: {
              model: "gpt-4o-mini",
              prompt: "Summarize this article content: {{input.content}}",
            },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "slack",
            label: "Broadcast to #content",
            description: "Posts key takeaways to Slack",
            category: "action",
            config: { channel: "#content", text: "📝 **Article Summary**:\n{{steps.node-openai-1.output.text}}" },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-openai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-openai-1", target: "node-slack-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Daily Reminder Email",
    description: "Send automated scheduled email notifications to team members or customers at regular intervals.",
    category: "Productivity",
    icon: "Clock",
    tags: ["productivity", "reminder", "email", "schedule"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Daily Reminder Email",
      description: "Automated recurring email notification workflow",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 9 AM Schedule",
            description: "Triggers every weekday morning",
            category: "trigger",
            config: { cron: "0 9 * * 1-5", preset: "daily", time: "09:00" },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "email",
            label: "Send Standup Reminder",
            description: "Dispatches daily team check-in reminder",
            category: "action",
            config: {
              to: "team@company.com",
              subject: "Daily Standup Check-in Reminder",
              body: "Good morning team! Please update your daily standup notes before 10 AM.",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Weekly Team Report Automation",
    description: "Compile weekly status updates automatically every Friday afternoon and distribute them on Slack.",
    category: "Productivity",
    icon: "Users",
    tags: ["team", "reporting", "openai", "slack"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Weekly Team Report Automation",
      description: "Generates weekly team performance summary via AI",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Friday 5 PM Schedule",
            description: "Runs every Friday at 5:00 PM UTC",
            category: "trigger",
            config: { cron: "0 17 * * 5", preset: "weekly", time: "17:00" },
          },
        },
        {
          id: "node-openai-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "openai",
            label: "Format Weekly Highlights",
            description: "Synthesizes week's key accomplishments into clean report",
            category: "action",
            config: {
              model: "gpt-4o-mini",
              prompt: "Generate a weekly team accomplishment summary with sections: Completed, In Progress, Blockers.",
            },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "slack",
            label: "Post to #team-updates",
            description: "Sends weekly report to main team channel",
            category: "action",
            config: { channel: "#team-updates", text: "📊 **Weekly Team Report**:\n{{steps.node-openai-1.output.text}}" },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-openai-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-openai-1", target: "node-slack-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Website Uptime & Status Monitor",
    description: "Periodically ping web endpoints via HTTP GET, evaluate HTTP status code with an IF condition, and alert on downtime.",
    category: "Operations",
    icon: "Globe",
    tags: ["monitoring", "uptime", "http", "email"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Website Uptime & Status Monitor",
      description: "Automated HTTP health check monitor with immediate email downtime alerts",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Every 5 Minutes",
            description: "Runs health check every 5 minutes",
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
            label: "Ping Target API / Website",
            description: "Executes HTTP GET check to target URL",
            category: "action",
            config: { method: "GET", url: "https://api.example.com/health" },
          },
        },
        {
          id: "node-if-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "if",
            label: "Check Status == 200",
            description: "Evaluates whether server responded with 200 OK",
            category: "logic",
            config: { fieldPath: "status", operator: "equals", value: 200 },
          },
        },
        {
          id: "node-email-alert",
          type: "neuraloop-node",
          position: { x: 1000, y: 250 },
          data: {
            definitionId: "email",
            label: "Send Downtime Alert",
            description: "Alerts DevOps team when endpoint is down",
            category: "action",
            config: {
              to: "devops@company.com",
              subject: "🚨 CRITICAL: Endpoint Health Check Failed",
              body: "Target website failed health check. HTTP status: {{steps.node-http-1.output.status}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-if-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-if-1", target: "node-email-alert", sourceHandle: "false", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Weather Alert Notification",
    description: "Fetch weather API forecasts every morning and send a customized weather report straight to your inbox.",
    category: "Personal",
    icon: "Cloud",
    tags: ["weather", "http", "email", "schedule"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Weather Alert Notification",
      description: "Fetches weather data via HTTP API and emails daily weather briefing",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Daily 7 AM Trigger",
            description: "Triggers every morning at 7:00 AM UTC",
            category: "trigger",
            config: { cron: "0 7 * * *", preset: "daily", time: "07:00" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Fetch Weather API",
            description: "Calls weather API endpoint for daily forecast",
            category: "action",
            config: { method: "GET", url: "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.41&current_weather=true" },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 800, y: 150 },
          data: {
            definitionId: "email",
            label: "Email Daily Weather",
            description: "Sends current weather summary to user",
            category: "action",
            config: {
              to: "user@example.com",
              subject: "☀️ Morning Weather Report",
              body: "Today's forecast temperature: {{steps.node-http-1.output.body.current_weather.temperature}}°C",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Lead Notification to Slack",
    description: "Instantly capture incoming leads from webhooks and broadcast rich lead details directly into sales Slack channels.",
    category: "Sales",
    icon: "Zap",
    tags: ["leads", "sales", "webhook", "slack"],
    featured: true,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Lead Notification to Slack",
      description: "Real-time inbound lead routing to Slack for sales team outreach",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Inbound Lead Webhook",
            description: "Endpoint to ingest new leads from CRM or form",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "slack",
            label: "Alert #sales-leads",
            description: "Posts new lead details immediately to Slack",
            category: "action",
            config: {
              channel: "#sales-leads",
              text: "🔥 **New Inbound Lead Received!**\n- Name: {{input.lead.name}}\n- Company: {{input.lead.company}}\n- Email: {{input.lead.email}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-slack-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Contact Form Instant Alert",
    description: "Trigger an immediate email alert to support managers whenever a user submits a contact form on your site.",
    category: "Marketing",
    icon: "Mail",
    tags: ["marketing", "contact-form", "webhook", "email"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Contact Form Instant Alert",
      description: "Receives contact form submissions via HTTP webhook and emails support desk",
      status: "published",
      nodes: [
        {
          id: "node-webhook-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "webhook",
            label: "Contact Form Ingestion",
            description: "Ingests submission form data",
            category: "trigger",
            config: { method: "POST" },
          },
        },
        {
          id: "node-email-1",
          type: "neuraloop-node",
          position: { x: 450, y: 150 },
          data: {
            definitionId: "email",
            label: "Notify Support Desk",
            description: "Emails submitted message to support inbox",
            category: "action",
            config: {
              to: "support@company.com",
              subject: "New Contact Form Inquiry from {{input.name}}",
              body: "From: {{input.name}} ({{input.email}})\n\nMessage:\n{{input.message}}",
            },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-webhook-1", target: "node-email-1", sourceHandle: "out", targetHandle: "in" },
      ],
    },
  },
  {
    name: "Crypto Price Threshold Alert",
    description: "Monitor Bitcoin / Crypto prices hourly via API, evaluate price thresholds with IF logic, and post Slack alerts.",
    category: "Operations",
    icon: "TrendingUp",
    tags: ["crypto", "finance", "http", "if", "slack"],
    featured: false,
    isOfficial: true,
    isPublic: true,
    definition: {
      name: "Crypto Price Threshold Alert",
      description: "Hourly API price ticker with threshold condition triggers for Slack alerts",
      status: "published",
      nodes: [
        {
          id: "node-schedule-1",
          type: "neuraloop-node",
          position: { x: 100, y: 150 },
          data: {
            definitionId: "schedule",
            label: "Hourly Schedule",
            description: "Runs ticker check every hour",
            category: "trigger",
            config: { cron: "0 * * * *", preset: "hourly" },
          },
        },
        {
          id: "node-http-1",
          type: "neuraloop-node",
          position: { x: 400, y: 150 },
          data: {
            definitionId: "http-request",
            label: "Fetch Price Ticker",
            description: "Queries public crypto price API",
            category: "action",
            config: { method: "GET", url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" },
          },
        },
        {
          id: "node-if-1",
          type: "neuraloop-node",
          position: { x: 700, y: 150 },
          data: {
            definitionId: "if",
            label: "Check BTC > $60,000",
            description: "Evaluates if price threshold crossed",
            category: "logic",
            config: { fieldPath: "bitcoin.usd", operator: "greater_than", targetValue: 60000 },
          },
        },
        {
          id: "node-slack-1",
          type: "neuraloop-node",
          position: { x: 1000, y: 100 },
          data: {
            definitionId: "slack",
            label: "Post Price Surge Alert",
            description: "Alerts #crypto channel on threshold surge",
            category: "action",
            config: { channel: "#crypto", text: "🚀 **Bitcoin Alert**: BTC current price is ${{steps.node-http-1.output.bitcoin.usd}}!" },
          },
        },
      ],
      edges: [
        { id: "edge-1-2", source: "node-schedule-1", target: "node-http-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-2-3", source: "node-http-1", target: "node-if-1", sourceHandle: "out", targetHandle: "in" },
        { id: "edge-3-4", source: "node-if-1", target: "node-slack-1", sourceHandle: "true", targetHandle: "in" },
      ],
    },
  },
];

export async function seedTemplates() {
  console.log("Seeding official Neuraloop templates...");

  let seededCount = 0;
  for (const tpl of INITIAL_TEMPLATES) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { name: tpl.name, isOfficial: true },
    });

    if (!existing) {
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

  console.log(`Seeded ${seededCount} official templates into database.`);
}

if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding templates:", err);
      process.exit(1);
    });
}
