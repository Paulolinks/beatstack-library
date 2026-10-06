import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { IndustrySection } from "@/components/IndustrySection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { AudienceCards } from "@/components/AudienceCards";
import { WhyItMatters } from "@/components/WhyItMatters";
import { CompareColumns } from "@/components/CompareColumns";
import { MarketPositioning } from "@/components/MarketPositioning";
import { PricingCard } from "@/components/PricingCard";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyCTA } from "@/components/StickyCTA";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="pb-20 sm:pb-0">
        <Hero />
        <ProblemSection />
        <IndustrySection />
        <FeatureGrid />
        <AudienceCards />
        <WhyItMatters />
        <CompareColumns />
        <MarketPositioning />
        <PricingCard />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
      <StickyCTA />
    </>
  );
}
