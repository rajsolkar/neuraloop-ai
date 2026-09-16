import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { userId } = await requireAuthUser();

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId || "");
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const templates = await prisma.workflowTemplate.findMany({
      where: userId
        ? { OR: [{ userId: null }, { userId }] }
        : { userId: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    if (!body.name || !body.definition) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields: name, definition" } },
        { status: 400 },
      );
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        userId,
        name: body.name,
        description: body.description ?? "",
        category: body.category ?? "custom",
        definition: body.definition,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create template" } },
      { status: 500 },
    );
  }
}
