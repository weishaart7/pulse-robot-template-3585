import { cn } from '@/lib/utils';

interface OuiNonToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  id?: string;
  'aria-labelledby'?: string;
}

// Bascule segmentée Oui / Non : même dessin que la civilité, à la hauteur d'un
// champ (h-9) pour s'aligner sur la grille des fiches client et conjoint.
export function OuiNonToggle({ value, onChange, id, ...aria }: OuiNonToggleProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={aria['aria-labelledby']}
      className="grid h-9 w-full grid-cols-2 gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]"
    >
      {([true, false] as const).map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-[2px] border text-[12.5px] transition-colors',
            value === option
              ? 'border-foreground bg-foreground text-background'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {option ? 'Oui' : 'Non'}
        </button>
      ))}
    </div>
  );
}
