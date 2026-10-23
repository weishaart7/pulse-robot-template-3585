import { cn } from '@/lib/utils';
import type { FiscalOverview } from '@/hooks/useFiscalOverview';
import { formatEuros } from '../FiscalOverviewCard';
import { DECLARATION_2042_SECTIONS } from './declaration2042Sections';

interface Declaration2042SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  /** Impôt calculé sur les sections enregistrées (Vision générale), rafraîchi au changement de section. */
  overview: FiscalOverview;
}

const groupes = [...new Set(DECLARATION_2042_SECTIONS.map((s) => s.groupe))];

function LigneResume({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1 text-[12.5px]', fort ? 'border-t border-foreground/20 pt-2 font-medium text-foreground' : 'text-muted-foreground')}>
      <span>{libelle}</span>
      <span className="tabular-nums text-foreground">{valeur}</span>
    </div>
  );
}

/** Navigation par cadre du Cerfa et résumé de l'impôt calculé, sur fond taupe. */
const Declaration2042Sidebar = ({ activeSection, onSectionChange, overview }: Declaration2042SidebarProps) => {
  const { impot, parts, foyerRenseigne } = overview;
  return (
    <nav aria-label="Sections de la 2042" className="flex w-[272px] shrink-0 flex-col overflow-y-auto border-r border-border bg-secondary">
      <div className="flex-1 px-4 py-6">
        {groupes.map((groupe) => (
          <div key={groupe} className="mb-5">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{groupe}</p>
            {DECLARATION_2042_SECTIONS.filter((s) => s.groupe === groupe).map((section) => {
              const Icon = section.icon;
              const actif = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={actif ? 'page' : undefined}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'relative flex w-full items-start gap-2.5 rounded-[2px] px-3 py-2 text-left text-[13px] leading-5 transition-colors',
                    actif ? 'bg-background font-medium text-foreground shadow-[0_0_0_1px_hsl(var(--border))]' : 'text-foreground/80 hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  {actif && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-lagon" />}
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', actif ? 'text-lagon-ink' : 'text-muted-foreground')} />
                  <span className="min-w-0">{section.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-border px-7 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Impôt sur le revenu net</p>
        <p className="mt-1.5 text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em] text-foreground">{formatEuros(impot.impotNet)}</p>
        <div className="mt-4">
          <LigneResume libelle="Revenu net imposable" valeur={formatEuros(impot.revenuImposable)} />
          <LigneResume libelle="Nombre de parts" valeur={parts.nombreParts.toLocaleString('fr-FR')} />
          <LigneResume libelle="Taux marginal" valeur={`${Math.round(impot.tmi * 100)} %`} />
        </div>
        <p className="mt-3 text-[11.5px] leading-4 text-muted-foreground">
          {foyerRenseigne ? 'Calculé sur les sections enregistrées.' : 'Foyer non enregistré : calcul sur les valeurs par défaut.'}
        </p>
      </div>
    </nav>
  );
};

export default Declaration2042Sidebar;
