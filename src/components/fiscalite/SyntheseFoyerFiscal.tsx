import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';

interface SyntheseFoyerFiscalProps {
  foyer: FoyerFiscalInput;
}

function formatParts(parts: number): string {
  return parts.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Nombre de parts du brouillon en cours de saisie (avant enregistrement), détail par majoration. */
export const SyntheseFoyerFiscal = ({ foyer }: SyntheseFoyerFiscalProps) => {
  const result = calculerPartsFiscales(foyer);

  return (
    <div className="rounded-[2px] border border-border bg-secondary px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Quotient familial</p>
      <p className="mt-2 text-[28px] font-medium leading-none tabular-nums tracking-[-0.02em] text-foreground">
        {formatParts(result.nombreParts)} part{result.nombreParts > 1 ? 's' : ''}
      </p>

      <div className="mt-5 border-t border-border">
        <div className="flex items-baseline justify-between border-b border-border py-2 text-[13px]">
          <span className="text-muted-foreground">Parts de base</span>
          <span className="font-medium tabular-nums text-foreground">{formatParts(result.partsBase)}</span>
        </div>
        {result.majorations.map(m => (
          <div key={m.type} className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-[13px]">
            <span className="text-muted-foreground">{m.libelle}</span>
            <span className="font-medium tabular-nums text-foreground">+{formatParts(m.parts)}</span>
          </div>
        ))}
      </div>
      {result.majorations.length === 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">Aucune majoration applicable.</p>
      )}
      <p className="mt-4 text-[12px] leading-5 text-muted-foreground">Recalculé pendant la saisie, avant l'enregistrement.</p>
    </div>
  );
};

export default SyntheseFoyerFiscal;
