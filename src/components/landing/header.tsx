"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu, X, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

function NeuraloopMark() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-ink shadow-sm">
      <span aria-hidden className="relative flex h-3.5 w-3.5">
        <span className="h-3.5 w-3.5 rounded-sm bg-accent animate-pulse" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
      </span>
    </span>
  );
}

export function LandingHeader() {
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-canvas/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <NeuraloopMark />
          <span className="text-lg font-bold tracking-tight text-ink">
            Neuraloop
          </span>
          <span className="hidden sm:inline-block rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-semibold text-accent-ink border border-accent/30">
            v2.0 Beta
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-soft">
          <a
            href="#features"
            className="transition-colors hover:text-ink hover:underline underline-offset-4 decoration-accent"
          >
            Features
          </a>
          <a
            href="#demo"
            className="transition-colors hover:text-ink hover:underline underline-offset-4 decoration-accent"
          >
            Live Simulator
          </a>
          <a
            href="#templates"
            className="transition-colors hover:text-ink hover:underline underline-offset-4 decoration-accent"
          >
            Templates
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-ink hover:underline underline-offset-4 decoration-accent"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="transition-colors hover:text-ink hover:underline underline-offset-4 decoration-accent"
          >
            FAQ
          </a>
        </nav>

        {/* Auth Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/workflows">
                <Button variant="primary" size="sm" className="gap-2 shadow-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <div className="flex items-center pl-1">
                <UserButton />
              </div>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ink-soft hover:text-ink"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/workflows">
                <Button variant="primary" size="sm" className="gap-1.5 shadow-sm">
                  <Sparkles className="h-4 w-4 text-accent-ink" />
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 pb-6 pt-4 space-y-4 shadow-lg">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-ink-soft">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-ink"
            >
              Features
            </a>
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-ink"
            >
              Live Simulator
            </a>
            <a
              href="#templates"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-ink"
            >
              Templates
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-ink"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-ink"
            >
              FAQ
            </a>
          </nav>

          <div className="pt-2 border-t border-border flex flex-col gap-2.5">
            {isLoaded && isSignedIn ? (
              <Link href="/workflows" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link href="/workflows" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
