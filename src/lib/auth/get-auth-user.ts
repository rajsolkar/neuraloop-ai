import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type AppRole = "owner" | "admin" | "member";

export interface AuthContext {
  userId: string | null;
  orgId: string | null;
  orgRole: AppRole | null;
}

export function normalizeOrgRole(clerkRole?: string | null): AppRole {
  if (!clerkRole) return "member";
  const lower = clerkRole.toLowerCase();
  if (lower.includes("owner")) return "owner";
  if (lower.includes("admin")) return "admin";
  return "member";
}

/**
 * Retrieves the authenticated Clerk User ID, Organization ID, and Organization Role
 */
export async function getAuthUser(): Promise<AuthContext> {
  try {
    const session = await auth();
    if (session?.userId) {
      return {
        userId: session.userId,
        orgId: session.orgId || null,
        orgRole: session.orgRole ? normalizeOrgRole(session.orgRole) : null,
      };
    }
  } catch (_err) {
    if (!process.env.CLERK_SECRET_KEY) {
      return { userId: null, orgId: null, orgRole: null };
    }
  }

  return { userId: null, orgId: null, orgRole: null };
}

/**
 * Ensures request is authenticated. Returns userId, orgId, orgRole if authorized,
 * or errorResponse (HTTP 401) if unauthorized.
 */
export async function requireAuthUser(): Promise<
  | { userId: string; orgId: string | null; orgRole: AppRole | null; errorResponse: null }
  | { userId: null; orgId: null; orgRole: null; errorResponse: NextResponse }
> {
  const { userId, orgId, orgRole } = await getAuthUser();

  if (!userId) {
    if (!process.env.CLERK_SECRET_KEY) {
      return { userId: "dev_local_user", orgId: null, orgRole: "owner", errorResponse: null };
    }

    return {
      userId: null,
      orgId: null,
      orgRole: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { userId, orgId, orgRole, errorResponse: null };
}

/**
 * Validates whether a given user role satisfies a required minimum permission level
 */
export function hasRequiredRole(userRole: AppRole | null, requiredRole: AppRole): boolean {
  if (!userRole) return false;
  if (requiredRole === "member") return true;
  if (requiredRole === "admin") return userRole === "admin" || userRole === "owner";
  if (requiredRole === "owner") return userRole === "owner";
  return false;
}
