import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PricingComparison = () => {
  const plans = [
    {
      name: "Gratuit",
      price: "0€",
      description: "Pour débuter",
      features: [
        "Contenu d'apprentissage",
        "Gestion basique du patrimoine",
        "Calculs fiscaux simples",
        "Support communautaire"
      ],
      highlighted: false
    },
    {
      name: "Premium",
      price: "29€",
      period: "/mois",
      description: "Pour les experts",
      features: [
        "Contenu d'apprentissage",
        "Gestion complète du patrimoine",
        "Calculs fiscaux avancés",
        "Optimisation IFI",
        "Simulations de transmission",
        "Support prioritaire",
        "Export de rapports",
        "API d'intégration"
      ],
      highlighted: true
    },
    {
      name: "Famille",
      price: "79€",
      period: "/mois",
      description: "Pour toute la famille",
      features: [
        "Contenu d'apprentissage",
        "Gestion complète du patrimoine",
        "Calculs fiscaux avancés",
        "Optimisation IFI",
        "Simulations de transmission",
        "Support prioritaire",
        "Jusqu'à 6 comptes Premium"
      ],
      highlighted: false
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground">
            Tarification simple et transparente
          </h2>
          <p className="text-lg text-muted-foreground">
            Sans engagement. Annulez à tout moment.
          </p>
          <Button 
            size="lg" 
            className="mt-4"
          >
            Essayer 1 semaine gratuite
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${
                plan.highlighted 
                  ? 'border-primary border-2 shadow-lg' 
                  : 'border-border'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Populaire
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
