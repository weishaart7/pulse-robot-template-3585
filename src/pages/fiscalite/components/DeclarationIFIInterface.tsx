import type { ReactNode } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PanelTitle, panelButtonClass, WorkspaceHeader } from '@/components/layout/workspace-panel';
import { cn } from '@/lib/utils';
import { useDeclarationIFI } from '@/hooks/useDeclarationIFI';
import { ANNEE_IFI } from '@/hooks/useFiscalOverview';
import type { Plafonnement2042 } from '@/services/declarationIFIDonnees';
import { formatEuros } from './2044/Grille2044';
import { ActifSection, LiquidationSection, PassifSection, ReductionsSection } from './declarationIFI/SectionsIFI';

interface DeclarationIFIInterfaceProps {
  onClose: () => void;
  /** 9PR et 9PX repris de la Vision générale, valables pour ANNEE_IFI seulement ; null si le foyer n'est pas renseigné. */
  plafonnement2042: Plafonnement2042 | null;
}

/** Case du Cerfa : les cases renseignées ressortent, les cases à zéro s'effacent. */
function CaseReport({ code, libelle, valeur }: { code: string; libelle: string; valeur: number | null }) {
  const vide = !valeur;
  return (
    <div className={cn('grid grid-cols-[2.75rem_1fr_auto] items-baseline gap-2 border-b border-border py-2 text-[12.5px]', vide && 'text-muted-foreground/70')}>
      <span className={cn('tabular-nums', !vide && 'font-medium text-lagon-ink')}>{code}</span>
      <span className={cn(!vide && 'text-foreground')}>{libelle}</span>
      <span className={cn('tabular-nums', !vide && 'font-medium text-foreground')}>
        {valeur === null ? '—' : formatEuros(valeur)}
      </span>
    </div>
  );
}

function GroupeCases({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{titre}</p>
      <div className="border-t border-border">{children}</div>
    </div>
  );
}

function LigneResume({ libelle, valeur, fort }: { libelle: string; valeur: number; fort?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1 text-[13px]', fort ? 'border-t border-foreground/20 pt-2 font-medium text-foreground' : 'text-muted-foreground')}>
      <span>{libelle}</span>
      <span className="tabular-nums text-foreground">{formatEuros(valeur)}</span>
    </div>
  );
}

const DeclarationIFIInterface = ({ onClose, plafonnement2042 }: DeclarationIFIInterfaceProps) => {
  // Seule l'IFI 2026 (revenus 2025) est traitée pour l'instant.
  const annee = ANNEE_IFI;
  const etat = useDeclarationIFI(annee, plafonnement2042);
  const r = etat.resultat;

  return (
    <div className="workspace-panel fixed inset-0 z-50 flex flex-col bg-background">
      <WorkspaceHeader
        icon={<Building2 />}
        trail={['Fiscalité', '2042-IFI — Fortune immobilière', `IFI ${annee}`]}
        actions={(
          <Button variant="ghost" onClick={onClose} className={panelButtonClass}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Button>
        )}
      />

      {etat.loading ? (
        <LoadingSpinner text="Chargement de la déclaration IFI..." />
      ) : (
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1180px]">
              <div className="px-8 pb-2 pt-8">
                <h1 className="text-[24px] font-medium tracking-[-0.02em]">Impôt sur la fortune immobilière</h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Formulaire n° 2042-IFI : patrimoine immobilier au 1er janvier {annee}, déclaré avec les revenus {annee - 1}.
                </p>
              </div>
              <ActifSection etat={etat} annee={annee} />
              <PassifSection etat={etat} annee={annee} />
              <ReductionsSection etat={etat} annee={annee} />
              <LiquidationSection resultat={r} />
            </div>
          </main>

          <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border bg-secondary px-7 py-8 lg:block">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">IFI net à payer</p>
            <p className="mt-2 text-[32px] font-medium leading-none tabular-nums tracking-[-0.02em]">{formatEuros(r.ifiNet)}</p>
            {!r.assujetti && <p className="mt-2 text-[12.5px] text-muted-foreground">Non assujetti : patrimoine net ≤ 1 300 000 €</p>}
            <div className="mt-6 space-y-0.5">
              <LigneResume libelle="Actif imposable" valeur={r.actifBrut} />
              <LigneResume libelle="Passif déductible" valeur={-(r.case9GF + r.case9GH)} />
              <LigneResume libelle="Patrimoine net taxable" valeur={r.patrimoineNet} fort />
            </div>

            <div className="mt-8">
              <PanelTitle>Cases de la déclaration</PanelTitle>
              <GroupeCases titre="Actif">
                <CaseReport code="9AA" libelle="Résidence principale" valeur={r.case9AA} />
                <CaseReport code="9AB" libelle="Autres immeubles bâtis" valeur={r.case9AB} />
                <CaseReport code="9AC" libelle="Bois et forêts" valeur={r.case9AC} />
                <CaseReport code="9AD" libelle="Biens ruraux" valeur={r.case9AD} />
                <CaseReport code="9BA" libelle="Parts de GFA et GAF" valeur={r.case9BA} />
                <CaseReport code="9BB" libelle="Autres biens non bâtis" valeur={r.case9BB} />
                <CaseReport code="9CA" libelle="Biens détenus indirectement" valeur={r.case9CA} />
              </GroupeCases>
              <GroupeCases titre="Passif">
                <CaseReport code="9GF" libelle="Dettes de travaux" valeur={r.case9GF} />
                <CaseReport code="9GH" libelle="Autres dettes" valeur={r.case9GH} />
              </GroupeCases>
              <GroupeCases titre="Dons et plafonnement">
                <CaseReport code="9NC" libelle="Dons en France" valeur={r.case9NC} />
                <CaseReport code="9NG" libelle="Dons dans l’UE" valeur={r.case9NG} />
                <CaseReport code="9PR" libelle="Impôts sur les revenus" valeur={r.case9PR} />
                <CaseReport code="9PX" libelle="Revenus" valeur={r.case9PX} />
              </GroupeCases>
            </div>
            <p className="mt-6 text-[12px] leading-5 text-muted-foreground">
              Reprise dans l’imposition totale de la Vision générale.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DeclarationIFIInterface;
