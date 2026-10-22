import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  PanelCard,
  PanelCardContent,
  PanelCardDescription,
  PanelCardHeader,
  PanelCardTitle,
  panelFigureClass,
  panelInsetClass,
} from '@/components/layout/panel-section';
import { EntreePensionConsolidee } from '@/lib/retraite/pensionConsolidee';
import { PeriodeCarriere } from '@/lib/retraite/parseRIS';
import { TrimestresEnfantsParRegime } from '@/lib/retraite/trimestresEnfants';
import { TypeAnomalie, detecterAnomalies, estimerGains } from '@/lib/retraite/verificationCarriere';

const LIBELLE_TYPE: Record<TypeAnomalie, string> = {
  annee_manquante: 'Année manquante',
  trimestres_sous_comptes: 'Trimestres sous-comptés',
  agirc_arrco_absent: 'Points Agirc-Arrco absents',
  rci_absent: 'Points RCI absents',
  chomage_sans_points: 'Chômage sans points',
  trimestres_enfants: 'Trimestres enfants',
};

const formatEuroMois = (valeur: number) =>
  `${valeur >= 0 ? '+' : ''}${Math.round(valeur).toLocaleString('fr-FR')} € / mois`;

interface VerificationCarriereProps {
  entree: EntreePensionConsolidee;
  periodes: PeriodeCarriere[];
  trimestresRISRegimeGeneral: number;
  historique: { total: number; parAnnee: { annee: number; cotises: number }[] };
  trimestresEnfants: TrimestresEnfantsParRegime;
  mdaDejaAuRis: boolean;
  dateEffet: Date;
}

/**
 * Vérification de carrière (phase 4, A3) : anomalies du relevé et gain estimé
 * de chaque régularisation (verificationCarriere.ts). Informatif : la pension
 * affichée ailleurs reste calculée sur le relevé tel quel.
 */
export const VerificationCarriere = ({
  entree,
  periodes,
  trimestresRISRegimeGeneral,
  historique,
  trimestresEnfants,
  mdaDejaAuRis,
  dateEffet,
}: VerificationCarriereProps) => {
  const resultat = useMemo(() => {
    const anomalies = detecterAnomalies({
      periodes,
      trimestresRISRegimeGeneral,
      historique,
      trimestresEnfants,
      mdaDejaAuRis,
    });
    return estimerGains(entree, anomalies);
  }, [entree, periodes, trimestresRISRegimeGeneral, historique, trimestresEnfants, mdaDejaAuRis]);

  const regularisables = resultat.anomalies.filter((a) => a.type !== 'trimestres_enfants').length;

  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Vérification de carrière</PanelCardTitle>
        <PanelCardDescription>
          Anomalies détectées sur le relevé importé et gain de pension brute estimé au départ du{' '}
          {dateEffet.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}, si la caisse les régularise. Informatif : les
          montants des autres sections restent calculés sur le relevé tel quel.
        </PanelCardDescription>
      </PanelCardHeader>
      <PanelCardContent>
        {periodes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Importez le relevé de carrière pour lancer la vérification.</p>
        ) : resultat.anomalies.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-lagon" />
            Aucune anomalie détectée sur le relevé importé.
          </div>
        ) : (
          <>
            <div className={`${panelInsetClass} flex items-baseline justify-between gap-4`}>
              <span className="text-xs text-muted-foreground">
                {regularisables} régularisation{regularisables > 1 ? 's' : ''} possible
                {regularisables > 1 ? 's' : ''}, toutes ensemble
              </span>
              <span className={panelFigureClass}>{formatEuroMois(resultat.gainMensuelTotal)}</span>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {resultat.anomalies.map((anomalie, index) => (
                <div key={`${anomalie.type}-${anomalie.annees.join('-')}-${index}`} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-spark" />
                    <div className="space-y-0.5">
                      <div className="text-[13px] font-medium">
                        {LIBELLE_TYPE[anomalie.type]}
                        {anomalie.annees.length > 0 && anomalie.annees.length <= 6 && ` · ${anomalie.annees.join(', ')}`}
                      </div>
                      <div className="text-xs text-muted-foreground">{anomalie.libelle}</div>
                      <div className="text-xs text-muted-foreground">
                        {[anomalie.aJustifier && 'à justifier auprès de la caisse', anomalie.estimation && 'estimation']
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium tabular-nums whitespace-nowrap">
                    {formatEuroMois(anomalie.gainMensuel)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Gains bruts, chacun mesuré seul ; le total mesure toutes les régularisations ensemble (effets de seuil
              sur le taux plein compris) et exclut les trimestres enfants, déjà comptés dans la pension estimée. Points
              estimés au barème actuel.
            </p>
          </>
        )}
      </PanelCardContent>
    </PanelCard>
  );
};
