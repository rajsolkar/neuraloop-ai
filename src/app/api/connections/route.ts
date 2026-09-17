import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let userId = "user_demo_123";
  let orgId: string | undefined = undefined;

  try {
    const authObj = await auth();
    if (authObj?.userId) {
      userId = authObj.userId;
      orgId = authObj.orgId || undefined;
    }
  } catch (err) {
    console.warn("Clerk auth optional check in /api/connections:", err);
  }

  try {
    const connections = await prisma.oAuthConnection.findMany({
      where: orgId ? { organizationId: orgId } : { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ connections });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, connections: [] }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "CONNECTION_ID_REQUIRED: Missing connection id parameter." }, { status: 400 });
  }

  let userId = "user_demo_123";
  let orgId: string | undefined = undefined;

  try {
    const authObj = await auth();
    if (authObj?.userId) {
      userId = authObj.userId;
      orgId = authObj.orgId || undefined;
    }
  } catch (err) {
    console.warn("Clerk auth optional check in /api/connections DELETE:", err);
  }

  try {
    const conn = await prisma.oAuthConnection.findFirst({
      where: {
        id,
        ...(orgId ? { organizationId: orgId } : { userId }),
      },
    });

    if (!conn) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }

    // Delete associated Vault credential and OAuthConnection record
    await prisma.credential.deleteMany({ where: { id: conn.credentialId } }).catch(() => {});
    await prisma.oAuthConnection.delete({ where: { id: conn.id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
