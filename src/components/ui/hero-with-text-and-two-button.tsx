import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
function Hero1() {
  return <div className="w-full bg-white">
      <div className="container mx-auto">
        <div className="flex gap-12 py-32 items-center justify-center flex-col mx-auto my-0 px-6 lg:py-40 max-w-5xl">
          <div className="flex gap-6 flex-col">
            <h1 className="text-6xl md:text-8xl max-w-4xl tracking-tight text-center font-semibold leading-[1.05] text-gray-900">
              Simulez et optimisez votre patrimoine en toute simplicité
            </h1>
            <p className="text-xl md:text-2xl leading-relaxed tracking-tight text-gray-600 max-w-3xl text-center font-normal mt-2">
              La gestion patrimoniale est complexe. PatrimonIA vous aide à simuler, 
              analyser et optimiser votre patrimoine avec des outils intelligents et intuitifs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button size="lg" className="gap-3 text-base px-6 py-6 rounded-full bg-secondary hover:bg-secondary/90 text-white font-medium">
              Commencer <MoveRight className="w-5 h-5" />
            </Button>
            <Button size="lg" className="gap-3 text-base px-6 py-6 rounded-full font-medium text-secondary hover:text-secondary/80" variant="link">
              En savoir plus
            </Button>
          </div>
        </div>
      </div>
    </div>;
}
export { Hero1 };