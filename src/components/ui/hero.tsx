"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Mockup, MockupFrame } from "@/components/ui/mockup"

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  subtitle?: string
  eyebrow?: string
  ctaText?: string
  ctaLink?: string
  mockupImage?: {
    src: string
    alt: string
  }
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ className, title, subtitle, eyebrow, ctaText, ctaLink, mockupImage, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center bg-[#f3f1ea]", className)}
        {...props}
      >
        {eyebrow && (
          <p 
            className="font-instrument-sans uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-[249px] mb-8 text-[#000000] animate-appear opacity-0"
          >
            {eyebrow}
          </p>
        )}

        <h1 
          className="text-[64px] leading-[83px] text-center px-4 lg:px-[314px] text-[#000000] animate-appear opacity-0 delay-100"
        >
          {title}
        </h1>

        {subtitle && (
          <p 
            className="text-[28px] text-center font-instrument-sans font-light px-4 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-[#000000] animate-appear opacity-0 delay-300"
          >
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <a href={ctaLink}>
            <div 
              className="inline-flex items-center bg-[#000000] text-[#ffffff] rounded-[10px] hover:bg-[#000000]/90 transition-colors font-instrument-sans w-[227px] h-[49px] animate-appear opacity-0 delay-500"
            >
              <div className="flex items-center justify-between w-full pl-[22px] pr-[17px]">
                <span className="text-[19px] whitespace-nowrap">{ctaText}</span>
                <div className="flex items-center gap-[14px]">
                  <div className="w-[36px] h-[15px] relative">
                    <img
                      src="https://res.cloudinary.com/ducqjmtlk/image/upload/v1737918196/Arrow_1_tacbar.svg"
                      alt="Arrow"
                      width={36}
                      height={15}
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </a>
        )}

        {mockupImage && (
          <div className="mt-20 w-full relative animate-appear opacity-0 delay-700">
            <MockupFrame>
              <Mockup type="responsive">
                <img
                  src={mockupImage.src}
                  alt={mockupImage.alt}
                  className="w-full"
                />
              </Mockup>
            </MockupFrame>
            <div
              className="absolute bottom-0 left-0 right-0 w-full h-[303px]"
              style={{
                background: "linear-gradient(to top, #DCD5C1 0%, rgba(217, 217, 217, 0) 100%)",
                zIndex: 10,
              }}
            />
          </div>
        )}
      </div>
    )
  }
)
Hero.displayName = "Hero"

export { Hero }
