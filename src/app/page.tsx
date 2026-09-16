import { LandingHeader } from "@/components/landing/header";
import { LandingHero } from "@/components/landing/hero";
import { LandingInteractiveCanvasDemo } from "@/components/landing/interactive-canvas-demo";
import { LandingFeaturesShowcase } from "@/components/landing/features-showcase";
import { LandingTemplateSpotlight } from "@/components/landing/template-spotlight";
import { LandingPricingCalculator } from "@/components/landing/pricing-calculator";
import { LandingFaqSection } from "@/components/landing/faq-section";

export const metadata = {
  title: "Neuraloop · Visual Automation Engine for Modern Teams",
  description:
    "Design, trigger, and scale complex backend workflows visually with BullMQ queues, AES-256 encrypted vaults, and multi-tenant isolation.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-accent-dim selection:text-accent-ink">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingInteractiveCanvasDemo />
        <LandingFeaturesShowcase />
        <LandingTemplateSpotlight />
        <LandingPricingCalculator />
        <LandingFaqSection />
      </main>
    </div>
  );
}
