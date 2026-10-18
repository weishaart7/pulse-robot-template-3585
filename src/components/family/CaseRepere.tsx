import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaseRepereProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

// Case à cocher « à repère » : ligne d'au moins la hauteur d'un champ, filet
// gauche qui fonce et fond blanc une fois cochée, case à droite. Toute la ligne
// est cliquable ; un libellé long passe à la ligne. Utilisée par les fiches
// client, conjoint et membre de la famille.
export const CaseRepere = forwardRef<HTMLButtonElement, CaseRepereProps>(
  ({ label, checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex min-h-9 w-full items-center justify-between gap-3 border-l-2 px-3 py-1.5 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground',
        checked
          ? 'border-foreground bg-background text-foreground'
          : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
        className
      )}
      {...props}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors',
          checked ? 'border-foreground bg-foreground text-background' : 'border-foreground/35 bg-background'
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
      </span>
    </button>
  )
);
CaseRepere.displayName = 'CaseRepere';
