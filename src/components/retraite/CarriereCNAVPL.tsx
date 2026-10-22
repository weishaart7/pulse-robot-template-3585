import React from 'react';
import { PanelCard, PanelCardContent, PanelCardDescription, PanelCardHeader, PanelCardTitle, panelInsetClass, panelFigureClass } from '@/components/layout/panel-section';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DetailCNAVPL } from '@/lib/retraite/pensionConsolidee';
import { MILLESIME_COURANT } from '@/lib/retraite/parametres';

// Valeur du point CNAVPL 2026 (source : CNAVPL, cnavpl.fr) — pré-remplie
// mais modifiable par l'utilisateur, pas codée en dur dans le calcul.
export const VALEUR_POINT_CNAVPL_2026 = MILLESIME_COURANT.cnavplValeurPoint;

const formatEuro2 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface CarriereCNAVPLProps {
  /**
   * Détail calculé par le moteur (calculerPensionConsolidee, données
   * projetées selon le statut actuel) — source unique, la carte ne calcule
   * rien. `null` si le régime n'est pas coché.
   */
  detail: DetailCNAVPL | null;
  // Remontés au parent (Carriere.tsx), même pattern que CarriereFonctionPublique.
  hasCNAVPL: boolean;
  onHasCNAVPLChange: (value: boolean) => void;
  trimestresCNAVPL: string;
  onTrimestresCNAVPLChange: (value: string) => void;
  /** Nombre d'enfants retenus pour la majoration (libellé). */
  nombreEnfantsEligibles: number;
  // Persistés par le parent (useAutoSave dans Carriere.tsx) ; valeurPointCNAVPL
  // est initialisée avec VALEUR_POINT_CNAVPL_2026 (exportée ci-dessus).
  pointsCNAVPL: string;
  onPointsCNAVPLChange: (value: string) => void;
  valeurPointCNAVPL: string;
  onValeurPointCNAVPLChange: (value: string) => void;
}

export const CarriereCNAVPL = ({
  detail,
  hasCNAVPL,
  onHasCNAVPLChange,
  trimestresCNAVPL,
  onTrimestresCNAVPLChange,
  nombreEnfantsEligibles,
  pointsCNAVPL,
  onPointsCNAVPLChange,
  valeurPointCNAVPL,
  onValeurPointCNAVPLChange,
}: CarriereCNAVPLProps) => {
  const pointsSaisis = parseFloat(pointsCNAVPL) || 0;
  const trimestresSaisis = parseInt(trimestresCNAVPL) || 0;

  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Carrière CNAVPL</PanelCardTitle>
        <PanelCardDescription>
          À cocher si une partie de votre carrière relève de la CNAVPL (professions libérales non
          réglementées)
        </PanelCardDescription>
      </PanelCardHeader>
      <PanelCardContent>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has-cnavpl"
            checked={hasCNAVPL}
            onCheckedChange={(checked) => onHasCNAVPLChange(checked === true)}
          />
          <label htmlFor="has-cnavpl" className="text-xs">
            J'ai une carrière en CNAVPL
          </label>
        </div>

        {hasCNAVPL && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="points-cnavpl" className="text-xs">Points CNAVPL déjà accumulés</Label>
                <Input
                  id="points-cnavpl"
                  type="number"
                  placeholder="Ex: 10000"
                  value={pointsCNAVPL}
                  onChange={(e) => onPointsCNAVPLChange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valeur-point-cnavpl" className="text-xs">Valeur du point (€)</Label>
                <Input
                  id="valeur-point-cnavpl"
                  type="number"
                  step="0.0001"
                  value={valeurPointCNAVPL}
                  onChange={(e) => onValeurPointCNAVPLChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Pré-remplie avec la valeur 2026 (0,6599 €), modifiable.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trimestres-cnavpl" className="text-xs">Trimestres CNAVPL</Label>
                <Input
                  id="trimestres-cnavpl"
                  type="number"
                  placeholder="Ex: 40"
                  value={trimestresCNAVPL}
                  onChange={(e) => onTrimestresCNAVPLChange(e.target.value)}
                />
              </div>
            </div>

            {detail && (
            <div className={`${panelInsetClass}`}>
              <div className="text-xs text-muted-foreground mb-1">Pension CNAVPL</div>
              <div className={`${panelFigureClass}`}>
                {formatEuro2(detail.pensionFinale)} / an
              </div>
              {(detail.pointsCNAVPL !== pointsSaisis || detail.trimestresCNAVPL > trimestresSaisis) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Carrière projetée jusqu'au départ : {Math.round(detail.pointsCNAVPL).toLocaleString('fr-FR')} points,{' '}
                  {detail.trimestresCNAVPL} trimestres (trimestres enfants compris).
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {detail.decote < 0
                  ? `${detail.decote.toFixed(2)}% décote`
                  : 'Aucune décote'}{' '}
                sur trimestres tous régimes confondus
                {detail.surcoteTotalePct > 0 && (
                  <>
                    {' '}
                    · Surcote : +{detail.surcoteTotalePct.toFixed(2)}% ({formatEuro2(detail.surcoteMontant)} / an) —
                    classique {detail.surcoteClassiquePct.toFixed(2)}% + parentale {detail.surcoteParentalePct.toFixed(2)}%
                  </>
                )}
              </p>
              {detail.dureeRequiseAtteinte && (
                <p className="text-xs text-muted-foreground mt-1">
                  Surcote non calculée pour ce régime : les trimestres cotisés après l'âge légal ne
                  sont pas connus (saisie en total). Une éventuelle surcote n'est pas incluse dans
                  ce montant.
                </p>
              )}
              {detail.majorationEnfantsPct > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Majoration pour {nombreEnfantsEligibles} enfants : +{detail.majorationEnfantsPct}%
                </p>
              )}
            </div>
            )}
          </>
        )}
      </PanelCardContent>
    </PanelCard>
  );
};
