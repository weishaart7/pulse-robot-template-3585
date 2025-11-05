import React from "react";
import { Features } from "@/components/ui/features-8";

const ImageShowcaseSection = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6 tracking-tight">
          Des outils conçus pour votre croissance
        </h2>
        <p className="text-lg text-muted-foreground">
          Une plateforme complète pour gérer tous les aspects de votre patrimoine
        </p>
      </div>
      
      <Features />
    </div>
  );
};

export default ImageShowcaseSection;