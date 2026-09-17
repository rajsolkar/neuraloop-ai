import { NextResponse } from "next/server";
import { WorkflowMemoryService } from "@/lib/ai/workflow-memory";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, workflowId } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt string is required" }, { status: 400 });
    }

    const reply = `Hi! I'm Nori. I've processed your prompt: "${prompt}". You can ask me to add nodes, replace integrations, or optimize your workflow!`;

    if (workflowId) {
      await WorkflowMemoryService.appendConversationMessage(workflowId, { sender: "user", text: prompt });
      await WorkflowMemoryService.appendConversationMessage(workflowId, { sender: "nori", text: reply });
    }

    return NextResponse.json({
      success: true,
      message: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
