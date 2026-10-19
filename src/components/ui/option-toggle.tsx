import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Option oui / non compacte, à la place d'une case à cocher isolée : pastille à filet (angles 2 px,
// 32 px), cochée = encre + coche lagon. Plusieurs options se rangent sur une ligne (flex-wrap), avec
// leur aide « ? » éventuelle juste après le libellé.
export function OptionToggle({ checked, onChange, children, help, id }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  /** Aide (FieldHelp) affichée dans le rectangle, après le libellé. */
  help?: React.ReactNode;
  id?: string;
}) {
  return (
    <span className={cn(
      'inline-flex h-8 items-center rounded-[2px] border transition-colors',
      help ? 'pr-2' : '',
      checked
        ? 'border-foreground bg-foreground/[0.04] text-foreground'
        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
    )}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex h-full items-center gap-1.5 rounded-[2px] text-[12.5px]',
          help ? 'pl-3' : 'px-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <span className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border',
          checked ? 'border-lagon-ink bg-lagon-ink text-white' : 'border-border'
        )}>
          {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
        {children}
      </button>
      {help}
    </span>
  );
}
