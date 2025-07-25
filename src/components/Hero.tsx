import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
const Hero = () => {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ["incroyable", "nouveau", "merveilleux", "magnifique", "intelligent"], []);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);
  return <section className="overflow-hidden relative bg-cover" id="hero" style={{
    backgroundImage: 'url("/Header-background.webp")',
    backgroundPosition: 'center 30%',
    padding: '120px 20px 60px'
  }}>
      <div className="absolute -top-[10%] -right-[5%] w-1/2 h-[70%] bg-pulse-gradient opacity-20 blur-3xl rounded-full"></div>
      
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center">
          {/* Left side - New animated content */}
          <div className="w-full lg:w-1/2">
            <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
              <div className="flex gap-4 flex-col">
                <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
                  <span className="text-spektr-cyan-50">Essayez quelque chose</span>
                  <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                    &nbsp;
                    {titles.map((title, index) => <motion.span key={index} className="absolute font-semibold" initial={{
                    opacity: 0,
                    y: "-100"
                  }} transition={{
                    type: "spring",
                    stiffness: 50
                  }} animate={titleNumber === index ? {
                    y: 0,
                    opacity: 1
                  } : {
                    y: titleNumber > index ? -150 : 150,
                    opacity: 0
                  }}>
                        {title}
                      </motion.span>)}
                  </span>
                </h1>

                <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
                  Gérer une petite entreprise aujourd'hui est déjà difficile. Évitez
                  d'autres complications en abandonnant les méthodes commerciales
                  obsolètes et fastidieuses. Notre objectif est de rationaliser le
                  commerce des PME, le rendant plus facile et plus rapide que jamais.
                </p>
              </div>
              <div className="flex flex-row gap-3">
                <Button size="lg" className="gap-4" variant="outline">
                  Planifier un appel <PhoneCall className="w-4 h-4" />
                </Button>
                <Button size="lg" className="gap-4">
                  S'inscrire ici <MoveRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Right side - Original image */}
          <div className="w-full lg:w-1/2 relative mt-6 lg:mt-0">
            <div className="absolute inset-0 bg-dark-900 rounded-2xl sm:rounded-3xl -z-10 shadow-xl"></div>
            <div className="relative transition-all duration-500 ease-out overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl">
              <img src="/lovable-uploads/5663820f-6c97-4492-9210-9eaa1a8dc415.png" alt="Atlas Robot" className="w-full h-auto object-cover transition-transform duration-500 ease-out" style={{
              transformStyle: 'preserve-3d'
            }} />
              <div className="absolute inset-0" style={{
              backgroundImage: 'url("/hero-image.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              mixBlendMode: 'overlay',
              opacity: 0.5
            }}></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block absolute bottom-0 left-1/4 w-64 h-64 bg-pulse-100/30 rounded-full blur-3xl -z-10"></div>
    </section>;
};
export default Hero;