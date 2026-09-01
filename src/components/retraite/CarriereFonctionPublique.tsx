import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  tauxProratisation,
  pensionComplementaireAnnuelle,
  ageLegalAtteint,
  ageLegalParentaleEligible,
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
  DateNaissance,
} from '@/lib/retraite/calcul';
import {
  pensionBaseFonctionPublique,
  decoteFonctionPublique,
  tauxDecoteParTrimestreFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  pensionFonctionPubliqueAvecMajorationEnfants,
  VALEUR_REFERENCE_MIGA_ANNUELLE_2026,
  VALEUR_REFERENCE_MIGA_MENSUELLE_2026,
  supplementNBI,
} from '@/lib/retraite/calculFonctionPublique';

// Valeur de service du point RAFP 2026 (source : rafp.fr, communiqué ERAFP
// du 16 décembre 2025) — sert à convertir des points déjà accumulés en
// rente annuelle via pensionComplementaireAnnuelle(). La valeur d'acquisition
// (1,4596 €, conversion € → points) n'est pas utilisée ici : les points sont
// saisis directement par l'utilisateur, pas reconstitués depuis un historique
// de primes (même principe que regimes_points pour l'Agirc-Arrco).
const VALEUR_SERVICE_POINT_RAFP_2026 = 0.05671;

const formatEuro2 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface CarriereFonctionPubliqueProps {
  // Durée d'assurance requise tous régimes confondus (même valeur que le
  // régime général dans Carriere.tsx) : ce n'est pas une notion propre à la
  // fonction publique, elle est partagée entre tous les régimes d'un même
  // assuré.
  trimestresRequis: number;
  // Trimestres des AUTRES régimes déjà saisis (régime général + CNAVPL le
  // cas échéant) : la décote fonction publique se base sur le total tous
  // régimes, pas seulement les trimestres fonction publique isolés. Nommé
  // génériquement (pas "RegimeGeneral") car ce total peut désormais
  // regrouper plusieurs sources.
  trimestresAutresRegimes: number;
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
  // Date de naissance du client (family_profiles, chargée une fois dans
  // Carriere.tsx) — nécessaire à ageLegalAtteint()/ageLegalParentaleEligible()
  // pour la surcote (écarts #5/#6). `null` tant que le profil famille n'est
  // pas encore chargé.
  dateNaissance: DateNaissance | null;
  // Condition n°1 (déclarative) de la surcote parentale (référentiel §2.3.2,
  // écart #6) — état du parent (case à cocher unique par client, pas propre
  // à un régime).
  auMoinsUnTrimestreMajorationEnfant: boolean;
  // Déclaratif : alimente la surcote CLASSIQUE de ce régime (art. L. 351-1-2
  // CSS), auparavant structurellement nulle faute de compteur.
  trimestresCotisesApresAgeLegal: string;
  onTrimestresCotisesApresAgeLegalChange: (value: string) => void;
  // Nombre d'enfants éligibles à la majoration pour 3 enfants ou plus
  // (écart #7, cas courant) — calculé une fois dans Carriere.tsx à partir de
  // family_links, partagé entre les régimes (même enfants, chaque régime
  // applique sa propre majoration sur sa propre pension).
  nombreEnfantsEligibles: number;
  // Reporte les résultats déjà calculés ici (pas les entrées brutes) au
  // parent, pour le total consolidé tous régimes de Carriere.tsx — évite de
  // dupliquer la logique de calcul FP ou de remonter le TIB/les points RAFP/
  // les âges catégorie active, qui restent propres à ce composant.
  onResultChange?: (result: { pensionFinale: number; rafpAnnuelle: number }) => void;
}

export const CarriereFonctionPublique = ({
  trimestresRequis,
  trimestresAutresRegimes,
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
  dateNaissance,
  auMoinsUnTrimestreMajorationEnfant,
  trimestresCotisesApresAgeLegal,
  onTrimestresCotisesApresAgeLegalChange,
  nombreEnfantsEligibles,
  onResultChange,
}: CarriereFonctionPubliqueProps) => {
  const tib = parseFloat(traitementIndiciaireBrut) || 0;
  const trimestresLiquidablesNum = parseInt(trimestresLiquidables) || 0;
  const pointsRAFPNum = parseFloat(pointsRAFP) || 0;
  const ageDepartAnticipeNum = parseFloat(ageDepartAnticipe);
  const ageAnnulationDecoteNum = parseFloat(ageAnnulationDecote);
  // Champ déclaratif (référentiel §7.3) : année où l'agent réunit la
  // condition d'âge/durée ouvrant droit à pension, distincte de la date
  // d'effet — non calculée par cet outil (cf. tauxDecoteParTrimestreFonctionPublique).
  // undefined si non renseigné, pour retomber sur le défaut 1,25 % (comportement
  // historique inchangé en l'absence de saisie).
  const anneeOuvertureDroitsNum = anneeOuvertureDroits === '' ? undefined : parseInt(anneeOuvertureDroits, 10);
  const tauxDecoteParTrimestre = tauxDecoteParTrimestreFonctionPublique(anneeOuvertureDroitsNum);

  const taux = tauxProratisation(trimestresLiquidablesNum, trimestresRequis);
  // Règle du plus petit des deux comptages (art. L. 14 I CPCMR), partagée
  // avec le moteur consolidé via `decoteFonctionPublique()` — voir son
  // docstring pour la règle et pour la raison de l'implémentation unique.
  // Aucun calcul local ici : c'est ce qui garantit que cet écran et
  // `calculerPensionConsolidee()` affichent la même décote pour un même
  // profil. Ne pas réintroduire de variante locale.
  //
  // La case « Départ anticipé catégorie active » ne conditionne PLUS ce
  // calcul : elle ne décrit que le motif du départ. Un agent sédentaire qui
  // saisit un âge de départ bénéficie de la règle au même titre.
  const decote = decoteFonctionPublique({
    trimestresLiquidables: trimestresLiquidablesNum,
    trimestresAutresRegimes,
    trimestresRequis,
    ageDepart: ageDepartAnticipeNum,
    ageAnnulationDecote: ageAnnulationDecoteNum,
    tauxDecoteParTrimestre,
  });

  const pensionCalculee = pensionBaseFonctionPublique(tib, taux, decote);
  const minimumGarantiValue = minimumGaranti(
    trimestresLiquidablesNum,
    trimestresRequis,
    VALEUR_REFERENCE_MIGA_ANNUELLE_2026,
    departPourInvalidite
  );
  const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, minimumGarantiValue);

  // Surcote (classique écart #5 + parentale écart #6), assise sur la pension
  // AVANT décote/MIGA — cf. pensionCalculeeAvantDecote ci-dessous — puis
  // ajoutée APRÈS le MIGA (référentiel §12.3), même principe que le régime
  // général dans Carriere.tsx.
  const pensionCalculeeAvantDecote = pensionBaseFonctionPublique(tib, taux, 0);
  const dateEffetProxy = new Date();
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = trimestresLiquidablesNum + trimestresAutresRegimes >= trimestresRequis;
  // ⚠️ Aucun détail de carrière par année pour ce régime (trimestresLiquidables
  // est un simple total saisi à la main, contrairement au détail carrière
  // daté du régime général) : le nombre de trimestres cotisés sur l'année de
  // référence n'est pas calculable ici. Branché à 0 plutôt qu'une valeur
  // fabriquée — la porte d'éligibilité reste correctement évaluée, seul le
  // montant reste nul faute de donnée. Dette technique documentée,
  // cf. docs/audit/branchement-majorations-pension-finale.md §1.c.
  // Surcote CLASSIQUE : alimentée par le champ déclaratif ci-dessous.
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    Math.max(0, parseInt(trimestresCotisesApresAgeLegal) || 0),
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  // ⚠️ Surcote PARENTALE : période de référence DIFFÉRENTE (année civile
  // précédant l'âge légal) — le champ déclaratif ne la renseigne PAS et ne
  // doit pas y être réutilisé. Reste à 0, dette documentée.
  const trimestresCotisesAnneeReferenceParentale = 0;
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReferenceParentale
  );
  // Exclusif pour la fonction publique (référentiel §7.4, §12.3) : la plus
  // élevée des deux est retenue, pas leur somme — interprétation signalée
  // pour validation dans implementation-surcote-parentale.md §2.
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, false);
  const surcoteMontant = pensionCalculeeAvantDecote * (surcoteTotalePct / 100);
  const pensionApresSurcote = pensionApresMiga + surcoteMontant;

  // Majoration pour 3 enfants ou plus (écart #7) — dégressive, plafonnée au
  // dernier traitement (référentiel §7.6), assise sur la pension APRÈS MIGA
  // et surcote (référentiel §12.3).
  const majorationEnfantsPct = majorationEnfantsFonctionPublique(nombreEnfantsEligibles);
  const pensionAvantNBI = pensionFonctionPubliqueAvecMajorationEnfants(
    pensionApresSurcote,
    majorationEnfantsPct,
    tib
  );

  // Supplément NBI (référentiel §7.7.1) : « s'ajoute à la pension liquidée »,
  // donc après décote/surcote/MIGA/majoration enfants. Formule sourcée
  // uniquement pour SRE/CNRACL — non calculé si le régime d'affiliation
  // n'est pas renseigné (sécurité par défaut, pas d'avantage accordé sans
  // donnée vérifiable).
  const moyenneAnnuelleNBINum = parseFloat(moyenneAnnuelleNBI) || 0;
  const trimestresLiquidablesNBINum = parseFloat(trimestresLiquidablesNBI) || 0;
  const montantSupplementNBI =
    regimeAffiliation === 'SRE' || regimeAffiliation === 'CNRACL'
      ? supplementNBI(moyenneAnnuelleNBINum, trimestresLiquidablesNBINum, trimestresRequis)
      : 0;
  const pensionFinale = pensionAvantNBI + montantSupplementNBI;

  // points et valeurPoint sont toujours définis ici (pointsRAFPNum est un
  // number, la valeur de service est une constante) : le résultat n'est
  // donc jamais undefined en pratique, malgré la signature générique de
  // pensionComplementaireAnnuelle.
  const rafpAnnuelle =
    pensionComplementaireAnnuelle({
      nom: 'RAFP',
      type: 'points',
      points: pointsRAFPNum,
      valeurPoint: VALEUR_SERVICE_POINT_RAFP_2026,
    }) ?? 0;

  useEffect(() => {
    onResultChange?.({ pensionFinale, rafpAnnuelle });
  }, [pensionFinale, rafpAnnuelle, onResultChange]);

  return (
    <Card>
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">Carrière fonction publique</CardTitle>
        <CardDescription className="text-xs">
          À cocher si une partie de votre carrière a été effectuée dans la fonction publique
          (polypensionné)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Visible sur le compte individuel RAFP officiel (
                  <a
                    href="https://www.rafp.fr"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] max-w-xs"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Année où l'agent a réuni la condition d'âge/durée ouvrant droit à pension —
                  distincte de l'année de liquidation. Détermine le taux de décote par trimestre
                  (0,75 % en 2011 jusqu'à 1,25 % à partir de 2015, référentiel §7.3). Non
                  renseigné = 1,25 % par défaut.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trimestres-cotises-apres-age-legal-fp" className="text-xs">
                  Trimestres cotisés au-delà de l'âge légal
                </Label>
                <Input
                  id="trimestres-cotises-apres-age-legal-fp"
                  type="number"
                  min={0}
                  placeholder="Ex: 8"
                  value={trimestresCotisesApresAgeLegal}
                  onChange={(e) => onTrimestresCotisesApresAgeLegalChange(e.target.value)}
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Trimestres cotisés au-delà de l'âge légal, période de référence de la surcote classique (art. L. 351-1-2 CSS). Saisie manuelle : ce régime n'a pas de détail de carrière année par année dans cet outil, la période ne peut donc pas être reconstituée automatiquement. Non renseigné = aucune surcote classique.
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
              <p className="text-xs text-muted-foreground">
                Champ déclaratif : décrit le motif du départ et adapte les repères de saisie
                ci-dessous. N'entre pas dans le calcul de la décote, qui s'appuie sur les deux
                âges saisis.
              </p>

              {/* Ces deux âges sont désormais saisissables pour TOUT agent, pas
                  seulement en catégorie active : la règle du plus petit des deux
                  comptages (art. L. 14 I CPCMR) s'applique à tout fonctionnaire.
                  Les conditionner à la case ci-dessus empêchait un sédentaire de
                  renseigner un âge de départ, donc d'en bénéficier. */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="age-depart-anticipe" className="text-xs">Âge de départ</Label>
                  <Input
                    id="age-depart-anticipe"
                    type="number"
                    placeholder={departAnticipeCategorieActive ? 'Ex: 57' : 'Ex: 64'}
                    value={ageDepartAnticipe}
                    onChange={(e) => onAgeDepartAnticipeChange(e.target.value)}
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="age-annulation-decote" className="text-xs">Âge d'annulation de la décote</Label>
                  <Input
                    id="age-annulation-decote"
                    type="number"
                    placeholder={departAnticipeCategorieActive ? 'Ex: 62' : '67 par défaut'}
                    value={ageAnnulationDecote}
                    onChange={(e) => onAgeAnnulationDecoteChange(e.target.value)}
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Renseigner l'âge de départ active la règle du plus petit des deux comptages
                  (durée d'assurance / âge) : la décote retenue est la plus favorable des deux.
                  Sans âge de départ, seule la durée d'assurance est prise en compte.
                </p>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Âge d'annulation de la décote non renseigné = 67 ans (catégorie sédentaire).
                  {departAnticipeCategorieActive
                    ? " En catégorie active, cet âge dépend du corps précis de l'agent (62 ans, 57 ans en super-active) : saisie manuelle assumée, à vérifier auprès de la CNRACL ou du SRE. Aucune table de corps n'est encodée dans cet outil."
                    : ''}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Pension fonction publique</div>
                <div className="text-lg font-semibold text-primary">
                  {formatEuro2(pensionFinale)} / an
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculée : {formatEuro2(pensionCalculee)} / an · Minimum garanti :{' '}
                  {formatEuro2(minimumGarantiValue)} / an
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum garanti calculé sur la valeur de référence 2026 (
                  {formatEuro2(VALEUR_REFERENCE_MIGA_MENSUELLE_2026)}/mois, indice majoré 227).
                </p>
                {surcoteTotalePct > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Surcote : +{surcoteTotalePct.toFixed(2)}% ({formatEuro2(surcoteMontant)} / an) —
                    classique {surcoteClassiquePct.toFixed(2)}% / parentale{' '}
                    {surcoteParentalePct.toFixed(2)}%, la plus élevée des deux est retenue (non
                    cumulables pour la fonction publique).
                  </p>
                )}
                {majorationEnfantsPct > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Majoration pour {nombreEnfantsEligibles} enfants : +{majorationEnfantsPct}%,
                    plafonnée au dernier traitement ({formatEuro2(tib)} / an).
                  </p>
                )}
                {montantSupplementNBI > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Supplément NBI ({regimeAffiliation}) : +{formatEuro2(montantSupplementNBI)} / an.
                  </p>
                )}
                {!regimeAffiliation && (moyenneAnnuelleNBINum > 0 || trimestresLiquidablesNBINum > 0) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Versant fonction publique non renseigné ci-dessus : le supplément NBI n'est pas
                    calculé malgré la saisie NBI.
                  </p>
                )}
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">RAFP</div>
                <div className="text-lg font-semibold text-primary">
                  {formatEuro2(rafpAnnuelle)} / an
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
