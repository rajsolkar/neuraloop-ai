import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Neuraloop Logo"
            className="mx-auto h-12 w-12 rounded-xl object-cover shadow-md border border-border/40 mb-3"
          />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in to Neuraloop</h1>
          <p className="mt-1 text-sm text-ink-muted">Access your workflow canvas & automation tools</p>
        </div>
        <div className="flex justify-center">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        </div>
      </div>
    </div>
  );
}
