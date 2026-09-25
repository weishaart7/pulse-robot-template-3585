import * as React from "react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface FieldHelpProps {
  children: React.ReactNode
  className?: string
  // Largeur de la bulle, à élargir pour un texte long (ex. "w-96").
  contentClassName?: string
  // Côté d'ouverture : "bottom" pour un texte long affiché haut dans la page.
  side?: "top" | "bottom"
}

// Petit "?" placé juste après un libellé de champ : la précision s'ouvre au
// survol, au toucher ou au focus clavier, au lieu de s'afficher en texte sous
// le champ. Le clic est neutralisé pour ne pas refermer ce que le survol vient
// d'ouvrir.
const FieldHelp = ({ children, className, contentClassName, side = "top" }: FieldHelpProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Aide"
          className={cn(
            "ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 align-middle text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={(e) => e.preventDefault()}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className={cn("w-72 p-3 text-xs font-normal leading-relaxed", contentClassName)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Sans ça, Radix rend le focus au bouton à la fermeture, ce qui
        // déclenche son onFocus et rouvre aussitôt la bulle.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

export { FieldHelp }
