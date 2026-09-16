"use client";

import { UserButton, useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-full animate-pulse rounded bg-ink/5" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-hover p-2">
        <UserButton showName appearance={{ elements: { userButtonBox: "flex-row-reverse" } }} />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <Button variant="outline" className="w-full justify-center">
        Sign In
      </Button>
    </SignInButton>
  );
}
