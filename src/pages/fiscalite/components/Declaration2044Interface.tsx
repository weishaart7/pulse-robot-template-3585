import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PanelTitle, panelButtonClass, WorkspaceHeader } from '@/components/layout/workspace-panel';
import { panelInsetClass } from '@/components/layout/panel-section';
import { cn } from '@/lib/utils';
import { useDeclaration2044 } from '@/hooks/useDeclaration2044';
import { ANNEE_REVENUS } from '@/hooks/useFiscalOverview';
import { formatEuros } from './2044/Grille2044';
import { DeficitsAnterieursSection, ImmeublesSection, PartsSection, ResultatSection } from './2044/Sections2044';

interface Declaration2044InterfaceProps {
  onClose: () => void;
}

function CaseReport({ code, libelle, valeur }: { code: string; libelle: string; valeur: number }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-2 border-b border-border/60 py-2 text-[13px]">
      <span className="font-medium tabular-nums">{code}</span>
      <span className="text-muted-foreground">{libelle}</span>
      <span className={cn('tabular-nums', valeur > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>{formatEuros(valeur)}</span>
    </div>
  );
}

const Declaration2044Interface = ({ onClose }: Declaration2044InterfaceProps) => {
  const annee = ANNEE_REVENUS;
  const etat = useDeclaration2044(annee);
  const r = etat.resultat;

  return (
    <div className="workspace-panel fixed inset-0 z-50 flex flex-col bg-background">
      <WorkspaceHeader
        icon={<Home />}
        trail={['Fiscalité', '2044 — Revenus fonciers', `Revenus ${annee}`]}
        actions={(
          <Button variant="ghost" onClick={onClose} className={panelButtonClass}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Button>
        )}
      />

      {etat.loading ? (
        <LoadingSpinner text="Chargement de la déclaration 2044..." />
      ) : (
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-8 pb-2 pt-6">
              <h1 className="text-[24px] font-medium tracking-[-0.02em]">Déclaration des revenus fonciers</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Régime réel. Formulaire n° 2044, annexe de la 2042 : revenus {annee}, déclarés en {annee + 1}.
              </p>
            </div>
            <ImmeublesSection etat={etat} annee={annee} />
            <PartsSection etat={etat} />
            <ResultatSection resultat={r} />
            <DeficitsAnterieursSection resultat={r} annee={annee} />
          </main>

          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border px-6 py-6 lg:block">
            <PanelTitle>Report sur la 2042</PanelTitle>
            <div className="mt-3">
              <CaseReport code="4BA" libelle="Revenus fonciers imposables" valeur={r.case4BA} />
              <CaseReport code="4BB" libelle="Déficit imputable sur les revenus fonciers" valeur={r.case4BB} />
              <CaseReport code="4BC" libelle="Déficit imputable sur le revenu global" valeur={r.case4BC} />
              <CaseReport code="4BD" libelle="Déficits antérieurs non encore imputés" valeur={r.case4BD} />
            </div>
            {r.case4BA > 0 && r.case4BD > 0 && (
              <div className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
                Après imputation des déficits antérieurs par l’administration, revenu foncier net imposable :{' '}
                <span className="font-medium text-foreground">{formatEuros(r.revenuFoncierNetImposable)}</span>.
              </div>
            )}
            <p className="mt-4 text-[12px] leading-5 text-muted-foreground">
              Reprises dans le calcul de l’impôt de la Vision générale (revenu foncier net ajouté, 4BC retranché, prélèvements sociaux à 17,2 %).
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Declaration2044Interface;
