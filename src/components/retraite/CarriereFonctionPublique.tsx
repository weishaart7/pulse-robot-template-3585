import React from 'react';
import { PanelCard, PanelCardContent, PanelCardDescription, PanelCardHeader, PanelCardTitle, panelInsetClass, panelFigureClass } from '@/components/layout/panel-section';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DetailFonctionPublique } from '@/lib/retraite/pensionConsolidee';


const formatEuro2 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface CarriereFonctionPubliqueProps {
  /**
   * Détail calculé par le moteur (calculerPensionConsolidee, données
   * projetées selon le statut actuel) — source unique, la carte ne calcule
   * rien. `null` si le régime n'est pas coché.
   */
  detail: DetailFonctionPublique | null;
  /** Nombre d'enfants retenus pour la majoration (libellé). */
  nombreEnfantsEligibles: number;
  // Remontés au parent (Carriere.tsx) car le total de trimestres tous
  // régimes doit aussi alimenter la décote du régime général — un state
  // purement local ici ne serait pas visible du composant frère.
  hasFonctionPublique: boolean;
  onHasFonctionPubliqueChange: (value: boolean) => void;
  trimestresLiquidables: string;
  onTrimestresLiquidablesChange: (value: string) => void;
  // Champs ci-dessous : remontés au parent pour la même raison que
  // hasFonctionPublique/trimestresLiquidables ci-dessus (persistance
  // automatique via useAutoSave dans Carriere.tsx, cf.
  // docs/audit/audit-fonction-publique-cnavpl.md) — purement locaux à ce
  // composant auparavant.
  traitementIndiciaireBrut: string;
  onTraitementIndiciaireBrutChange: (value: string) => void;
  pointsRAFP: string;
  onPointsRAFPChange: (value: string) => void;
  departAnticipeCategorieActive: boolean;
  onDepartAnticipeCategorieActiveChange: (value: boolean) => void;
  ageDepartAnticipe: string;
  onAgeDepartAnticipeChange: (value: string) => void;
  ageAnnulationDecote: string;
  onAgeAnnulationDecoteChange: (value: string) => void;
  departPourInvalidite: boolean;
  onDepartPourInvaliditeChange: (value: boolean) => void;
  anneeOuvertureDroits: string;
  onAnneeOuvertureDroitsChange: (value: string) => void;
  // Supplément NBI (écart #13-NBI) : formule sourcée uniquement pour
  // SRE/CNRACL (docs/retraite-base-referentiel.md §7.7.1) — regimeAffiliation
  // vide = supplément non calculé, jamais accordé par défaut.
  regimeAffiliation: string;
  onRegimeAffiliationChange: (value: string) => void;
  moyenneAnnuelleNBI: string;
  onMoyenneAnnuelleNBIChange: (value: string) => void;
  trimestresLiquidablesNBI: string;
  onTrimestresLiquidablesNBIChange: (value: string) => void;
}

export const CarriereFonctionPublique = ({
  detail,
  hasFonctionPublique,
  onHasFonctionPubliqueChange,
  trimestresLiquidables,
  onTrimestresLiquidablesChange,
  traitementIndiciaireBrut,
  onTraitementIndiciaireBrutChange,
  pointsRAFP,
  onPointsRAFPChange,
  departAnticipeCategorieActive,
  onDepartAnticipeCategorieActiveChange,
  ageDepartAnticipe,
  onAgeDepartAnticipeChange,
  ageAnnulationDecote,
  onAgeAnnulationDecoteChange,
  departPourInvalidite,
  onDepartPourInvaliditeChange,
  anneeOuvertureDroits,
  onAnneeOuvertureDroitsChange,
  regimeAffiliation,
  onRegimeAffiliationChange,
  moyenneAnnuelleNBI,
  onMoyenneAnnuelleNBIChange,
  trimestresLiquidablesNBI,
  onTrimestresLiquidablesNBIChange,
  nombreEnfantsEligibles,
}: CarriereFonctionPubliqueProps) => {
  const tibSaisi = parseFloat(traitementIndiciaireBrut) || 0;
  const trimestresSaisis = parseInt(trimestresLiquidables) || 0;
  const moyenneAnnuelleNBINum = parseFloat(moyenneAnnuelleNBI) || 0;
  const trimestresLiquidablesNBINum = parseFloat(trimestresLiquidablesNBI) || 0;

  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Carrière fonction publique</PanelCardTitle>
        <PanelCardDescription>
          À cocher si une partie de votre carrière a été effectuée dans la fonction publique
          (polypensionné)
        </PanelCardDescription>
      </PanelCardHeader>
      <PanelCardContent>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has-fonction-publique"
            checked={hasFonctionPublique}
            onCheckedChange={(checked) => onHasFonctionPubliqueChange(checked === true)}
          />
          <label htmlFor="has-fonction-publique" className="text-xs">
            J'ai eu une carrière dans la fonction publique
          </label>
        </div>

        {hasFonctionPublique && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tib" className="text-xs">Traitement indiciaire brut annuel (€)</Label>
                <Input
                  id="tib"
                  type="number"
                  placeholder="Ex: 36000"
                  value={traitementIndiciaireBrut}
                  onChange={(e) => onTraitementIndiciaireBrutChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Dernier indice détenu depuis au moins 6 mois avant cessation, en équivalent annuel
                  (traitement mensuel × 12).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trimestres-liquidables-fp" className="text-xs">
                  Trimestres liquidables fonction publique
                </Label>
                <Input
                  id="trimestres-liquidables-fp"
                  type="number"
                  placeholder="Ex: 60"
                  value={trimestresLiquidables}
                  onChange={(e) => onTrimestresLiquidablesChange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="points-rafp" className="text-xs">Points RAFP déjà accumulés</Label>
                <Input
                  id="points-rafp"
                  type="number"
                  placeholder="Ex: 4200"
                  value={pointsRAFP}
                  onChange={(e) => onPointsRAFPChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Visible sur le compte individuel RAFP officiel (
                  <a
                    href="https://www.rafp.fr"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-lagon-ink underline-offset-4 hover:underline"
                  >
                    rafp.fr
                  </a>
                  ).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regime-affiliation-fp" className="text-xs">
                Versant fonction publique (pour le supplément NBI)
              </Label>
              <Select
                value={regimeAffiliation || undefined}
                onValueChange={(value) => onRegimeAffiliationChange(value)}
              >
                <SelectTrigger
                  id="regime-affiliation-fp"
                  className="max-w-xs"
                >
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRE">SRE (fonction publique d'État)</SelectItem>
                  <SelectItem value="CNRACL">CNRACL (territoriale / hospitalière)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nécessaire pour calculer le supplément de pension NBI ci-dessous — non renseigné,
                aucun supplément n'est calculé (référentiel §7.7.1).
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="moyenne-annuelle-nbi" className="text-xs">
                  Moyenne annuelle NBI perçue (€)
                </Label>
                <Input
                  id="moyenne-annuelle-nbi"
                  type="number"
                  placeholder="Ex: 1200"
                  value={moyenneAnnuelleNBI}
                  onChange={(e) => onMoyenneAnnuelleNBIChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Moyenne annuelle des sommes perçues au titre de la NBI, déjà revalorisée
                  (relevé de carrière du client).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trimestres-liquidables-nbi" className="text-xs">
                  Trimestres de perception de la NBI
                </Label>
                <Input
                  id="trimestres-liquidables-nbi"
                  type="number"
                  placeholder="Ex: 20"
                  value={trimestresLiquidablesNBI}
                  onChange={(e) => onTrimestresLiquidablesNBIChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Trimestres liquidables pendant lesquels la NBI a été effectivement perçue (pas
                  la durée totale de carrière).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depart-pour-invalidite"
                  checked={departPourInvalidite}
                  onCheckedChange={(checked) => onDepartPourInvaliditeChange(checked === true)}
                />
                <label htmlFor="depart-pour-invalidite" className="text-xs">
                  Départ pour invalidité (moins de 15 ans de services)
                </label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Change le mode de calcul du minimum garanti pour une durée de services inférieure
                à 15 ans (référentiel §7.5) — sans effet à 15 ans de services ou plus.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="annee-ouverture-droits" className="text-xs">
                  Année d'ouverture des droits (optionnel)
                </Label>
                <Input
                  id="annee-ouverture-droits"
                  type="number"
                  placeholder="Ex: 2014"
                  value={anneeOuvertureDroits}
                  onChange={(e) => onAnneeOuvertureDroitsChange(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Année où l'agent a réuni la condition d'âge/durée ouvrant droit à pension —
                  distincte de l'année de liquidation. Détermine le taux de décote par trimestre
                  (0,75 % en 2011 jusqu'à 1,25 % à partir de 2015, référentiel §7.3). Non
                  renseigné = 1,25 % par défaut.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depart-anticipe-categorie-active"
                  checked={departAnticipeCategorieActive}
                  onCheckedChange={(checked) => onDepartAnticipeCategorieActiveChange(checked === true)}
                />
                <label htmlFor="depart-anticipe-categorie-active" className="text-xs">
                  Départ anticipé catégorie active
                </label>
              </div>

              {departAnticipeCategorieActive && (
                <div className="grid gap-3 md:grid-cols-2 pl-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="age-depart-anticipe" className="text-xs">Âge de départ anticipé</Label>
                    <Input
                      id="age-depart-anticipe"
                      type="number"
                      placeholder="Ex: 57"
                      value={ageDepartAnticipe}
                      onChange={(e) => onAgeDepartAnticipeChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="age-annulation-decote" className="text-xs">Âge d'annulation de la décote</Label>
                    <Input
                      id="age-annulation-decote"
                      type="number"
                      placeholder="Ex: 62"
                      value={ageAnnulationDecote}
                      onChange={(e) => onAgeAnnulationDecoteChange(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    Saisie manuelle assumée : ces âges dépendent du corps précis de l'agent
                    (catégorie active), à vérifier auprès de la CNRACL ou du SRE. Aucune table de
                    corps n'est encodée dans cet outil.
                  </p>
                </div>
              )}
            </div>

            {detail && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className={`${panelInsetClass}`}>
                <div className="text-xs text-muted-foreground mb-1">Pension fonction publique</div>
                <div className={`${panelFigureClass}`}>
                  {formatEuro2(detail.pensionFinale)} / an
                </div>
                {(detail.trimestresLiquidables !== trimestresSaisis || detail.traitementIndiciaireBrut !== tibSaisi) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Carrière projetée jusqu'au départ : {detail.trimestresLiquidables} trimestres liquidables
                    {detail.trimestresLiquidables > trimestresSaisis && ` dont ${detail.trimestresLiquidables - trimestresSaisis} projetés`},
                    TIB de fin de carrière {formatEuro2(detail.traitementIndiciaireBrut)} / an.
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Calculée : {formatEuro2(detail.pensionCalculee)} / an · Minimum garanti :{' '}
                  {formatEuro2(detail.minimumGaranti)} / an
                </p>
                {detail.decote < 0 && !departPourInvalidite ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum garanti non applicable : il est réservé aux pensions sans décote (durée
                    requise ou âge d'annulation de la décote atteint), sauf invalidité.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum garanti calculé sur la valeur de référence 2026 (1 366,35 €/mois pour
                    40 ans de services), sur les trimestres liquidables — bonifications comprises,
                    alors que seuls les services effectifs comptent : approximation possiblement
                    favorable.
                  </p>
                )}
                {detail.dureeRequiseAtteinte && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Surcote non calculée pour ce régime : les trimestres cotisés après l'âge légal ne
                    sont pas connus (saisie en total). Une éventuelle surcote n'est pas incluse dans
                    ce montant.
                  </p>
                )}
                {detail.surcoteTotalePct > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Surcote : +{detail.surcoteTotalePct.toFixed(2)}% ({formatEuro2(detail.surcoteMontant)} / an) —
                    classique {detail.surcoteClassiquePct.toFixed(2)}% / parentale{' '}
                    {detail.surcoteParentalePct.toFixed(2)}%, la plus élevée des deux est retenue (non
                    cumulables pour la fonction publique).
                  </p>
                )}
                {detail.majorationEnfantsPct > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Majoration pour {nombreEnfantsEligibles} enfants : +{detail.majorationEnfantsPct}%,
                    plafonnée au dernier traitement ({formatEuro2(detail.traitementIndiciaireBrut)} / an).
                  </p>
                )}
                {detail.montantSupplementNBI > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Supplément NBI ({regimeAffiliation}) : +{formatEuro2(detail.montantSupplementNBI)} / an.
                  </p>
                )}
                {!regimeAffiliation && (moyenneAnnuelleNBINum > 0 || trimestresLiquidablesNBINum > 0) && (
                  <p className="text-xs text-spark mt-1">
                    Versant fonction publique non renseigné ci-dessus : le supplément NBI n'est pas
                    calculé malgré la saisie NBI.
                  </p>
                )}
              </div>

              <div className={`${panelInsetClass}`}>
                <div className="text-xs text-muted-foreground mb-1">RAFP</div>
                {detail.rafp.forme === 'capital' ? (
                  <>
                    <div className={`${panelFigureClass}`}>{formatEuro2(detail.rafp.capital)} en capital</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Moins de 5 125 points : versement unique (coefficient de conversion{' '}
                      {detail.rafp.coefficientConversion.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}, majoration{' '}
                      {detail.rafp.coefficientMajoration.toLocaleString('fr-FR')}), hors pension annuelle.
                    </p>
                  </>
                ) : (
                  <>
                    <div className={`${panelFigureClass}`}>{formatEuro2(detail.rafpAnnuelle)} / an</div>
                    {detail.rafp.coefficientMajoration > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Coefficient de majoration pour âge : {detail.rafp.coefficientMajoration.toLocaleString('fr-FR')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            )}
          </>
        )}
      </PanelCardContent>
    </PanelCard>
  );
};
