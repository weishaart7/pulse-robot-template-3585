import React from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground leading-tight tracking-tight">
            Gestion de patrimoine intelligente pour professionnels
          </h1>
          
          {/* Hero description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Gérez votre patrimoine, optimisez votre fiscalité, et planifiez votre transmission—tout dans une plateforme unifiée.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8"
            >
              Commencer
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="font-medium px-8"
            >
              Réserver une démo
            </Button>
          </div>
        </div>

        {/* Dashboard preview image */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border">
            <img 
              src="/hero-image.jpg" 
              alt="Dashboard de gestion patrimoniale" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;