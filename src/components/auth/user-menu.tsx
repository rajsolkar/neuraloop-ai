"use client";

import { UserButton, OrganizationSwitcher, useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-full animate-pulse rounded bg-ink/5" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-col gap-2 p-1">
        <div className="flex items-center justify-between rounded-lg bg-surface-hover p-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Workspace
          </span>
          <OrganizationSwitcher
            hidePersonal={false}
            afterCreateOrganizationUrl="/team"
            afterSelectOrganizationUrl="/"
            appearance={{
              elements: {
                organizationSwitcherTrigger: "flex items-center gap-1.5 text-xs font-medium text-ink hover:text-accent-ink",
              },
            }}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-hover p-2">
          <UserButton showName appearance={{ elements: { userButtonBox: "flex-row-reverse text-xs" } }} />
        </div>
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <Button variant="outline" className="w-full justify-center text-xs">
        Sign In
      </Button>
    </SignInButton>
  );
}
