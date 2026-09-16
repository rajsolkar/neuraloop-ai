import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export interface AuthContext {
  userId: string | null;
}

/**
 * Retrieves the authenticated Clerk User ID from current request session context.
 */
export async function getAuthUser(): Promise<AuthContext> {
  try {
    const session = await auth();
    if (session?.userId) {
      return { userId: session.userId };
    }
  } catch (_err) {
    // If Clerk keys are absent in offline/dev test environments, fallback safely
    if (!process.env.CLERK_SECRET_KEY) {
      return { userId: null };
    }
  }

  if (!process.env.CLERK_SECRET_KEY) {
    return { userId: null };
  }

  return { userId: null };
}

/**
 * Ensures request is authenticated. Returns { userId, errorResponse: null } if authorized,
 * or { userId: null, errorResponse: NextResponse (401) } if unauthorized.
 */
export async function requireAuthUser(): Promise<
  { userId: string; errorResponse: null } | { userId: null; errorResponse: NextResponse }
> {
  const { userId } = await getAuthUser();

  if (!userId) {
    // Graceful fallback for dev environments where Clerk keys are intentionally unset
    if (!process.env.CLERK_SECRET_KEY) {
      return { userId: "dev_local_user", errorResponse: null };
    }

    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { userId, errorResponse: null };
}
