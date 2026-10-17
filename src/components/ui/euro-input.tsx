import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Champ numérique avec unité dans le champ, à droite (« € » par défaut), plutôt que « (€) » dans le
// libellé.
// Toutes les props (id, aria-* posés par FormControl, value, onChange…) vont au <input>.
type EuroInputProps = React.ComponentProps<typeof Input> & {
  /** Unité affichée dans le champ (« € » par défaut ; « % », « mois »…). */
  suffix?: string
}

const EuroInput = React.forwardRef<HTMLInputElement, EuroInputProps>(
  ({ className, suffix = "€", ...props }, ref) => (
    <div className="relative">
      <Input ref={ref} type="number" className={cn(suffix.length > 2 ? "pr-14" : "pr-8", "tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">{suffix}</span>
    </div>
  )
)
EuroInput.displayName = "EuroInput"

export { EuroInput }
