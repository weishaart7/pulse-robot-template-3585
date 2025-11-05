import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
function Hero1() {
  return <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 items-center justify-center flex-col mx-[47px] my-0 px-0 lg:py-[65px]">
          <div>
            <Button variant="secondary" size="sm" className="gap-4">
              Découvrez notre solution <MoveRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              Simulez et optimisez votre patrimoine en toute simplicité
            </h1>
            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              La gestion patrimoniale est complexe. PatrimonIA vous aide à simuler, 
              analyser et optimiser votre patrimoine avec des outils intelligents et intuitifs. 
              Prenez les meilleures décisions pour votre avenir financier.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button size="lg" className="gap-4" variant="outline">
              Prendre rendez-vous <PhoneCall className="w-4 h-4" />
            </Button>
            <Button size="lg" className="gap-4">
              Commencer <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>;
}
export { Hero1 };