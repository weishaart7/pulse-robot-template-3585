import React from "react";
import { Button } from "@/components/ui/button";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const Hero = () => {
  return (
    <section className="relative bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32">
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
      </div>

      {/* Scroll Animation Container */}
      <ContainerScroll
        titleComponent={
          <h2 className="text-4xl font-semibold text-foreground">
            Une plateforme complète <br />
            <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
              pour votre patrimoine
            </span>
          </h2>
        }
      >
        <img
          src="/hero-image.jpg"
          alt="Dashboard de gestion patrimoniale"
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
    </section>
  );
};

export default Hero;