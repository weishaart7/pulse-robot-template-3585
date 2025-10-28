import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary">
      {/* Diagonal background elements - Duolingo style */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 w-full h-full bg-background transform rotate-12 origin-top-right"></div>
        
        {/* Decorative sparkles */}
        <Sparkles className="absolute top-20 right-1/4 w-8 h-8 text-secondary animate-pulse-slow" />
        <Sparkles className="absolute top-40 right-1/3 w-6 h-6 text-accent animate-pulse-slow" style={{ animationDelay: '200ms' }} />
        <Sparkles className="absolute bottom-1/3 right-1/2 w-5 h-5 text-secondary/60 animate-pulse-slow" style={{ animationDelay: '500ms' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left side - Text content */}
          <div className="text-left space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-primary-foreground lowercase leading-tight">
              gérez votre patrimoine
              <br />
              <span className="text-primary-foreground">de façon simple</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-xl">
              Atteignez vos objectifs patrimoniaux avec la plateforme #1 de gestion de patrimoine
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-background text-primary hover:bg-background/90 text-lg font-bold rounded-2xl px-8 py-6"
              >
                Démarrer mon essai gratuit
              </Button>
            </div>

            <p className="text-sm text-primary-foreground/70">
              sans engagement. annulez à tout moment.
            </p>
          </div>

          {/* Right side - Mascot/Character area */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md aspect-square">
              {/* Colorful blob background */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-secondary rounded-full blur-3xl opacity-60 animate-float"></div>
              
              {/* Character placeholder - you can replace with your own mascot */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <div className="w-72 h-72 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-2xl animate-float">
                  <span className="text-6xl">🤖</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
