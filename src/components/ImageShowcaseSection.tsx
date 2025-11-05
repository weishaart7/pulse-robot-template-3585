import React from "react";
import { Features } from "@/components/ui/features-8";

const ImageShowcaseSection = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto text-center mb-20">
        <h2 className="text-5xl sm:text-6xl font-semibold text-gray-900 mb-8 tracking-tight leading-tight">
          Des outils conçus pour votre croissance
        </h2>
        <p className="text-xl sm:text-2xl text-gray-600 font-normal">
          Une plateforme complète pour gérer tous les aspects de votre patrimoine
        </p>
      </div>
      
      <Features />
    </div>
  );
};

export default ImageShowcaseSection;