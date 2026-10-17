import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Champ montant : « € » affiché dans le champ, à droite, plutôt que « (€) » dans le libellé.
// Toutes les props (id, aria-* posés par FormControl, value, onChange…) vont au <input>.
const EuroInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Input ref={ref} type="number" className={cn("pr-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
    </div>
  )
)
EuroInput.displayName = "EuroInput"

export { EuroInput }
