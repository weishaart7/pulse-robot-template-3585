import { useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function CaseReport({ code, libelle, valeur }: { code: string; libelle: string; valeur: number | null }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-2 border-b border-border/60 py-2 text-[13px]">
      <span className="font-medium tabular-nums">{code}</span>
      <span className="text-muted-foreground">{libelle}</span>
      <span className={cn('tabular-nums', valeur ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        {valeur === null ? '—' : formatEuros(valeur)}
      </span>
    </div>
  );
}

const DeclarationIFIInterface = ({ onClose, plafonnement2042 }: DeclarationIFIInterfaceProps) => {
  const [annee, setAnnee] = useState(ANNEE_IFI);
  const etat = useDeclarationIFI(annee, annee === ANNEE_IFI ? plafonnement2042 : null);
  const r = etat.resultat;
  const annees = [0, 1, 2].map((i) => ANNEE_IFI - i);

  return (
    <div className="workspace-panel fixed inset-0 z-50 flex flex-col bg-background">
      <WorkspaceHeader
        icon={<Building2 />}
        trail={['Fiscalité', '2042-IFI — Fortune immobilière', `IFI ${annee}`]}
        actions={(
          <>
            <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
              <SelectTrigger className={cn(panelButtonClass, 'w-32')} aria-label="Année d'imposition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {annees.map((a) => <SelectItem key={a} value={String(a)}>IFI {a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={onClose} className={panelButtonClass}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Retour
            </Button>
          </>
        )}
      />

      {etat.loading ? (
        <LoadingSpinner text="Chargement de la déclaration IFI..." />
      ) : (
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-8 pb-2 pt-6">
              <h1 className="text-[24px] font-medium tracking-[-0.02em]">Impôt sur la fortune immobilière</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Formulaire n° 2042-IFI : patrimoine immobilier au 1er janvier {annee}, déclaré avec les revenus {annee - 1}.
              </p>
            </div>
            <ActifSection etat={etat} annee={annee} />
            <PassifSection etat={etat} annee={annee} />
            <ReductionsSection etat={etat} annee={annee} />
            <LiquidationSection resultat={r} />
          </main>

          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border px-6 py-6 lg:block">
            <PanelTitle>IFI net à payer</PanelTitle>
            <p className="mt-2 text-[28px] font-medium tabular-nums tracking-[-0.02em]">{formatEuros(r.ifiNet)}</p>
            <p className="text-[12.5px] text-muted-foreground">
              Patrimoine net taxable {formatEuros(r.patrimoineNet)}
              {!r.assujetti && ' · non assujetti'}
            </p>

            <div className="mt-6">
              <PanelTitle>Cases de la déclaration</PanelTitle>
              <div className="mt-3">
                <CaseReport code="9AA" libelle="Résidence principale" valeur={r.case9AA} />
                <CaseReport code="9AB" libelle="Autres immeubles bâtis" valeur={r.case9AB} />
                <CaseReport code="9AC" libelle="Bois et forêts" valeur={r.case9AC} />
                <CaseReport code="9AD" libelle="Biens ruraux" valeur={r.case9AD} />
                <CaseReport code="9BA" libelle="Parts de GFA et GAF" valeur={r.case9BA} />
                <CaseReport code="9BB" libelle="Autres biens non bâtis" valeur={r.case9BB} />
                <CaseReport code="9CA" libelle="Biens détenus indirectement" valeur={r.case9CA} />
                <CaseReport code="9GF" libelle="Dettes de travaux" valeur={r.case9GF} />
                <CaseReport code="9GH" libelle="Autres dettes" valeur={r.case9GH} />
                <CaseReport code="9NC" libelle="Dons en France" valeur={r.case9NC} />
                <CaseReport code="9NG" libelle="Dons dans l’UE" valeur={r.case9NG} />
                <CaseReport code="9PR" libelle="Impôts sur les revenus" valeur={r.case9PR} />
                <CaseReport code="9PX" libelle="Revenus" valeur={r.case9PX} />
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-muted-foreground">
              {annee === ANNEE_IFI
                ? 'Reprise dans l’imposition totale de la Vision générale.'
                : `La Vision générale reprend l’IFI ${ANNEE_IFI} : cette année n’y est pas reprise.`}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DeclarationIFIInterface;
