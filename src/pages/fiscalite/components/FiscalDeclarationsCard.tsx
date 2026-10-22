import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PanelTitle } from '@/components/layout/workspace-panel';
import { cn } from '@/lib/utils';
import type { FiscalOverview } from '@/hooks/useFiscalOverview';
import IFIInterface from './IFIInterface';
import Declaration2042Interface from './Declaration2042Interface';
import Declaration2044Interface from './Declaration2044Interface';
import { formatEuros } from './FiscalOverviewCard';

interface FiscalDeclarationsCardProps {
  overview: FiscalOverview;
  /** Appelé à la fermeture de la 2042 ou de la 2044 pour rafraîchir la Vision générale (voir useFiscalOverview.ts). */
  onDeclarationClosed?: () => void;
}

type CodeOuvrable = '2042' | '2044' | '2042-IFI';

interface Declaration {
  code: string;
  titre: string;
  ouvrable?: CodeOuvrable;
}

const GROUPES: { titre: string; declarations: Declaration[] }[] = [
  {
    titre: 'Impôt sur le revenu',
    declarations: [
      { code: '2042', titre: 'Déclaration générale', ouvrable: '2042' },
      { code: '2044', titre: 'Revenus fonciers', ouvrable: '2044' },
      { code: '2047', titre: "Revenus perçus à l'étranger" },
      { code: '2074', titre: 'Plus ou moins-values de cession' },
      { code: '2086', titre: "Plus ou moins-values d'actifs numériques" },
    ],
  },
  {
    titre: 'Impôt sur la fortune immobilière',
    declarations: [{ code: '2042-IFI', titre: 'Impôt sur la fortune immobilière', ouvrable: '2042-IFI' }],
  },
];

const FiscalDeclarationsCard = ({ overview, onDeclarationClosed }: FiscalDeclarationsCardProps) => {
  const [ouverte, setOuverte] = useState<CodeOuvrable | null>(null);
  const fermer = () => { setOuverte(null); onDeclarationClosed?.(); };

  const statut = (d: Declaration): string | null => {
    if (!d.ouvrable) return 'À venir';
    if (d.ouvrable === '2042') return overview.foyerRenseigne ? `${formatEuros(overview.impot.impotNet)} d'IR` : 'Foyer à compléter';
    if (d.ouvrable === '2044') {
      const rf = overview.revenusFonciers;
      if (!rf) return 'Non ouverte';
      return rf.deficitImputableRevenuGlobal > 0
        ? `Déficit ${formatEuros(rf.deficitImputableRevenuGlobal)}`
        : `${formatEuros(rf.revenuFoncierNetImposable)} imposables`;
    }
    return null;
  };

  return (
    <>
      <div className="px-8 py-6">
        <PanelTitle>Déclarations fiscales</PanelTitle>
        {GROUPES.map((g) => (
          <div key={g.titre} className="mt-4">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{g.titre}</p>
            <ul className="mt-1">
              {g.declarations.map((d) => {
                const s = statut(d);
                return (
                  <li key={d.code}>
                    <button
                      type="button"
                      disabled={!d.ouvrable}
                      onClick={() => d.ouvrable && setOuverte(d.ouvrable)}
                      className={cn(
                        'group grid w-full grid-cols-[4.5rem_1fr_1rem] items-center gap-3 border-b border-border/60 py-2.5 text-left text-[13px]',
                        'enabled:hover:bg-secondary/40 disabled:cursor-default',
                      )}
                    >
                      <span className={cn(
                        'inline-flex h-6 w-fit items-center rounded-[2px] px-2 text-[12px] font-medium tabular-nums',
                        d.ouvrable ? 'bg-lagon-soft text-lagon-ink' : 'bg-secondary text-muted-foreground',
                      )}>
                        {d.code}
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block leading-snug', d.ouvrable ? 'text-foreground' : 'text-muted-foreground')}>{d.titre}</span>
                        {s && <span className="block text-[12px] tabular-nums text-muted-foreground">{s}</span>}
                      </span>
                      {d.ouvrable
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        : <span />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {ouverte === '2042-IFI' && <IFIInterface onClose={() => setOuverte(null)} />}
      {ouverte === '2042' && <Declaration2042Interface onClose={fermer} />}
      {ouverte === '2044' && <Declaration2044Interface onClose={fermer} />}
    </>
  );
};

export default FiscalDeclarationsCard;
