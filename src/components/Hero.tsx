import React from "react";
import { HeroSection } from "@/components/ui/hero-section-dark";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const Hero = () => {
  return (
    <HeroSection
      title="Gestion de patrimoine"
      subtitle={{
        regular: "Gestion de patrimoine intelligente pour ",
        gradient: "professionnels",
      }}
      description="Gérez votre patrimoine, optimisez votre fiscalité, et planifiez votre transmission—tout dans une plateforme unifiée."
      ctaText="Commencer"
      ctaHref="#"
      bottomImage={{
        light: "/dashboard-preview.png",
        dark: "/dashboard-preview.png",
      }}
      gridOptions={{
        angle: 65,
        opacity: 0.4,
        cellSize: 50,
        lightLineColor: "#4a4a4a",
        darkLineColor: "#2a2a2a",
      }}
    />
  );
};
export default Hero;