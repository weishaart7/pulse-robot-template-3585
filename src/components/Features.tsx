
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard = ({ icon, title, description, index }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      ref={cardRef}
      className={cn(
        "opacity-0 p-8 rounded-xl bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
      )}
      style={{ animationDelay: `${0.1 * index}s` }}
    >
      <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center text-primary mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
    </div>
  );
};

const Features = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6 tracking-tight">
          Tous les outils pour gérer votre patrimoine
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Patrimoine • Immobilier • Budget • Retraite • Fiscalité • Transmission • Sociétés
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 1 1-4-4"></path><path d="M12 8a4 4 0 1 0 4 4"></path><circle cx="12" cy="12" r="1"></circle></svg>}
          title="Suivi en temps réel"
          description="Visualisez l'évolution de votre patrimoine avec des tableaux de bord interactifs et des graphiques détaillés."
          index={0}
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>}
          title="Optimisation fiscale"
          description="Calculez automatiquement votre IFI, vos plus-values et identifiez les opportunités d'optimisation."
          index={1}
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="18" height="11" x="3" y="11" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>}
          title="Simulation transmission"
          description="Anticipez la transmission de votre patrimoine et optimisez les droits de succession."
          index={2}
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>}
          title="Gestion immobilière"
          description="Suivez vos biens, gérez vos revenus locatifs et calculez votre rentabilité immobilière."
          index={3}
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>}
          title="Sécurité renforcée"
          description="Vos données sont chiffrées et sécurisées selon les standards bancaires les plus élevés."
          index={4}
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M16 6H3v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path></svg>}
          title="Conseils personnalisés"
          description="Bénéficiez de recommandations adaptées à votre situation et vos objectifs patrimoniaux."
          index={5}
        />
      </div>
    </div>
  );
};

export default Features;
