import React from "react";
import { Hero as HeroComponent } from "@/components/ui/hero";

const Hero = () => {
  return (
    <HeroComponent
      eyebrow="INTRODUCING NOTION CALENDAR"
      title={
        <>
          <div className="whitespace-nowrap">
            <span className="font-instrument-serif font-normal">Your schedule, </span>
            <span className="font-instrument-serif font-normal italic">seamlessly </span>
            <span className="font-instrument-serif font-normal">connected</span>
          </div>
          <div className="font-instrument-serif font-normal">
            to your workspace
          </div>
        </>
      }
      subtitle="Notion Calendar brings your tasks, notes, and schedule together"
      ctaText="Download now"
      ctaLink="/"
      mockupImage={{
        src: "/dashboard-preview.png",
        alt: "Dashboard Preview"
      }}
    />
  );
};
export default Hero;