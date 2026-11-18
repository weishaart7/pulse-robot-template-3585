import { useMillesimeFiscal } from '@/contexts/MillesimeFiscalContext';
import { anneesRevenusDisponibles, parametresFiscaux } from '@/lib/fiscalite/parametres';
import { cn } from '@/lib/utils';

// Choix du millésime de règles : mêmes saisies de la 2042, calculées avec les paramètres de l'année
// choisie (la 2044 et la 2042-IFI suivent). Masqué tant qu'un seul millésime existe.
const MillesimeSelector = () => {
  const { anneeRevenus, choisirAnneeRevenus } = useMillesimeFiscal();
  const annees = anneesRevenusDisponibles();
  if (annees.length < 2) return null;

  return (
    <div role="radiogroup" aria-label="Millésime de règles fiscales" className="inline-flex h-8 rounded-[2px] border border-border">
      {annees.map((annee, i) => {
        const actif = annee === anneeRevenus;
        const provisoire = parametresFiscaux(annee).statut === 'provisoire';
        return (
          <button
            key={annee}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => choisirAnneeRevenus(annee)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 text-[12.5px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              i > 0 && 'border-l border-border',
              actif ? 'bg-foreground/[0.06] font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Revenus {annee}
            {provisoire && <span className="text-[11px] text-muted-foreground">(provisoire)</span>}
          </button>
        );
      })}
    </div>
  );
};

export default MillesimeSelector;
