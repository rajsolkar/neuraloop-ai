import { NextResponse } from "next/server";
import { NoriDebugger } from "@/lib/ai/nori-debugger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { executionData } = body;

    if (!executionData) {
      return NextResponse.json({ error: "executionData object is required" }, { status: 400 });
    }

    const analysis = NoriDebugger.analyzeExecutionFailure(executionData);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
