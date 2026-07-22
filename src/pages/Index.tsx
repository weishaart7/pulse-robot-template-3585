import { LandingNav } from "@/components/landing/LandingNav";
import { HeroCommon } from "@/components/landing/HeroCommon";
import { ParticuliersSection } from "@/components/landing/ParticuliersSection";
import { ProfessionnelsSection } from "@/components/landing/ProfessionnelsSection";
import { CredibiliteSection } from "@/components/landing/CredibiliteSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ConfianceSection } from "@/components/landing/ConfianceSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="landing-portal min-h-screen">
      <LandingNav />
      <main>
        <HeroCommon />
        <ParticuliersSection />
        <ProfessionnelsSection />
        <CredibiliteSection />
        <HowItWorksSection />
        <ConfianceSection />
        <FAQSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
