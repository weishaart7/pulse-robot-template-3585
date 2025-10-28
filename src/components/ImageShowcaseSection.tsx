import React from "react";
import { Features } from "@/components/ui/features-8";
import { Sparkles } from "lucide-react";

const ImageShowcaseSection = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      {/* Decorative sparkles */}
      <Sparkles className="absolute top-10 right-1/4 w-6 h-6 text-secondary animate-pulse-slow" />
      <Sparkles className="absolute top-32 left-1/4 w-5 h-5 text-accent animate-pulse-slow" style={{ animationDelay: '300ms' }} />
      <Sparkles className="absolute bottom-10 right-1/3 w-7 h-7 text-secondary/60 animate-pulse-slow" style={{ animationDelay: '600ms' }} />
      
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-6 tracking-tight lowercase">
          découvrez le futur aujourd'hui
        </h2>
        <p className="text-lg sm:text-xl text-primary-foreground/90">
          Notre robot humanoïde révolutionnaire transforme votre quotidien
        </p>
      </div>
      
      <Features />
    </div>
  );
};
export default ImageShowcaseSection;