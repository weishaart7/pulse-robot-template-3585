import React from "react";
import { Features } from "@/components/ui/features-8";
const ImageShowcaseSection = () => {
  return <section className="w-full pt-0 pb-8 sm:pb-12 bg-white" id="showcase">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto py-[17px]">
        <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12 animate-on-scroll">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-gray-900 mb-3 sm:mb-4">
            Experience the Future Today
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Our cutting-edge humanoid robot is designed to transform how we interact 
            with technology in everyday environments.
          </p>
        </div>
        
        <Features />
      </div>
    </section>;
};
export default ImageShowcaseSection;