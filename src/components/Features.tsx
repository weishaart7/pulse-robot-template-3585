
import React from "react";
import { ServiceCarousel, type Service } from "@/components/ui/services-card";
import { Activity, FileText, Users, Building2, Shield, Briefcase } from "lucide-react";

const services: Service[] = [
  {
    number: "001",
    title: "Suivi en temps réel",
    description: "Visualisez l'évolution de votre patrimoine avec des tableaux de bord interactifs et des graphiques détaillés.",
    icon: Activity,
    gradient: "from-secondary/20 to-secondary/30",
  },
  {
    number: "002",
    title: "Optimisation fiscale",
    description: "Calculez automatiquement votre IFI, vos plus-values et identifiez les opportunités d'optimisation.",
    icon: FileText,
    gradient: "from-primary/20 to-primary/30",
  },
  {
    number: "003",
    title: "Simulation transmission",
    description: "Anticipez la transmission de votre patrimoine et optimisez les droits de succession.",
    icon: Users,
    gradient: "from-secondary/30 to-secondary/40",
  },
  {
    number: "004",
    title: "Gestion immobilière",
    description: "Suivez vos biens, gérez vos revenus locatifs et calculez votre rentabilité immobilière.",
    icon: Building2,
    gradient: "from-primary/30 to-primary/40",
  },
  {
    number: "005",
    title: "Sécurité renforcée",
    description: "Vos données sont chiffrées et sécurisées selon les standards bancaires les plus élevés.",
    icon: Shield,
    gradient: "from-secondary/40 to-secondary/50",
  },
  {
    number: "006",
    title: "Conseils personnalisés",
    description: "Bénéficiez de recommandations adaptées à votre situation et vos objectifs patrimoniaux.",
    icon: Briefcase,
    gradient: "from-primary/40 to-primary/50",
  },
];

const Features = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-left mb-12">
        <h2 className="text-6xl font-bold tracking-tighter text-foreground mb-4">
          Tous les outils pour gérer votre patrimoine.
        </h2>
        <p className="text-lg text-muted-foreground">
          Patrimoine • Immobilier • Budget • Retraite • Fiscalité • Transmission • Sociétés
        </p>
      </div>
      
      <ServiceCarousel services={services} />
    </div>
  );
};

export default Features;
