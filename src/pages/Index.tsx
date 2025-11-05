import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StatsSection from "@/components/ui/stats-section";
import PricingComparison from "@/components/ui/pricing-comparison";
import ImageShowcaseSection from "@/components/ImageShowcaseSection";
import { FeatureGrid } from "@/components/ui/feature-section";
import { PieChart, TrendingUp, Shield, Building, Users, FileText } from "lucide-react";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
const Index = () => {
  console.log('🏠 Index page rendering');

  // Initialize intersection observer to detect when elements enter viewport
  useEffect(() => {
    console.log('🏠 Index useEffect - setting up intersection observer');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });
    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach(el => observer.observe(el));
    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);
  useEffect(() => {
    // This helps ensure smooth scrolling for the anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href')?.substring(1);
        if (!targetId) return;
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;

        // Increased offset to account for mobile nav
        const offset = window.innerWidth < 768 ? 100 : 80;
        window.scrollTo({
          top: targetElement.offsetTop - offset,
          behavior: 'smooth'
        });
      });
    });
  }, []);
  return <div className="min-h-screen bg-[#f3f3f3]">
      <Navbar />
      <main className="space-y-0">
        <Hero />
        
        <section className="py-20 bg-muted/30">
          <ImageShowcaseSection />
        </section>
        <section className="py-20 bg-background">
          <FeatureGrid title={<>
                Conçu{' '}
                <span className="relative inline-block">
                  pour vous
                <svg viewBox="0 0 120 6" className="absolute left-0 bottom-0 -mb-1 w-full" aria-hidden="true">
                  <path d="M1 4.5C25.46 1.63 78.43 1.39 119 4.5" stroke="hsl(var(--secondary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                </span>
              </>} subtitle="Gérez et optimisez votre patrimoine avec des outils professionnels adaptés à vos besoins." illustrationSrc="/lovable-uploads/22d31f51-c174-40a7-bd95-00e4ad00eaf3.png" illustrationAlt="Illustration PatrimonIA" categories={[{
          icon: <PieChart size={24} />,
          title: 'Patrimoine',
          items: [{
            text: 'Vue consolidée de vos actifs'
          }, {
            text: 'Suivi des passifs et emprunts'
          }, {
            text: 'Analyse de la répartition'
          }]
        }, {
          icon: <TrendingUp size={24} />,
          title: 'Fiscalité',
          items: [{
            text: 'Calcul IFI automatique'
          }, {
            text: 'Optimisation fiscale'
          }, {
            text: 'Simulations détaillées'
          }]
        }, {
          icon: <Shield size={24} />,
          title: 'Transmission',
          items: [{
            text: 'Calcul des droits de succession'
          }, {
            text: 'Stratégies de donation'
          }, {
            text: 'Protection du conjoint'
          }]
        }, {
          icon: <Building size={24} />,
          title: 'Immobilier',
          items: [{
            text: 'Gestion locative'
          }, {
            text: 'Suivi des charges et revenus'
          }, {
            text: 'Rentabilité par bien'
          }]
        }, {
          icon: <Users size={24} />,
          title: 'Retraite',
          items: [{
            text: 'Estimation des pensions'
          }, {
            text: 'Calcul des trimestres'
          }, {
            text: 'Stratégie épargne retraite'
          }]
        }, {
          icon: <FileText size={24} />,
          title: 'Rapports',
          items: [{
            text: 'Bilan patrimonial complet'
          }, {
            text: 'Recommandations personnalisées'
          }, {
            text: 'Export PDF professionnel'
          }]
        }]} buttonText="Découvrir toutes les fonctionnalités" buttonHref="#features" />
        </section>
        <section className="py-20 bg-muted/30">
          <PricingComparison />
        </section>
        <section className="py-20 bg-background">
          <Testimonials />
        </section>
        <section className="py-20 bg-muted/30">
          <Newsletter />
        </section>
      </main>
      <Footer />
    </div>;
};
export default Index;