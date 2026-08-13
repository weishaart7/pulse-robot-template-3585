import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  tauxProratisation,
  decoteApplicable,
  decoteSurTrimestresPlafond25,
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
  decoteSurAgeFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  pensionFonctionPubliqueAvecMajorationEnfants,
  VALEUR_REFERENCE_MIGA_ANNUELLE_2025,
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
  // Date de naissance du client (family_profiles, chargée une fois dans
  // Carriere.tsx) — nécessaire à ageLegalAtteint()/ageLegalParentaleEligible()
  // pour la surcote (écarts #5/#6). `null` tant que le profil famille n'est
  // pas encore chargé.
  dateNaissance: DateNaissance | null;
  // Condition n°1 (déclarative) de la surcote parentale (référentiel §2.3.2,
  // écart #6) — état du parent (case à cocher unique par client, pas propre
  // à un régime).
  auMoinsUnTrimestreMajorationEnfant: boolean;
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
  dateNaissance,
  auMoinsUnTrimestreMajorationEnfant,
  nombreEnfantsEligibles,
  onResultChange,
}: CarriereFonctionPubliqueProps) => {
  const [traitementIndiciaireBrut, setTraitementIndiciaireBrut] = useState<string>('');
  const [pointsRAFP, setPointsRAFP] = useState<string>('');
  const [departAnticipeCategorieActive, setDepartAnticipeCategorieActive] = useState(false);
  const [ageDepartAnticipe, setAgeDepartAnticipe] = useState<string>('');
  const [ageAnnulationDecote, setAgeAnnulationDecote] = useState<string>('');
  const [departPourInvalidite, setDepartPourInvalidite] = useState(false);

  const tib = parseFloat(traitementIndiciaireBrut) || 0;
  const trimestresLiquidablesNum = parseInt(trimestresLiquidables) || 0;
  const pointsRAFPNum = parseFloat(pointsRAFP) || 0;
  const ageDepartAnticipeNum = parseFloat(ageDepartAnticipe);
  const ageAnnulationDecoteNum = parseFloat(ageAnnulationDecote);

  const taux = tauxProratisation(trimestresLiquidablesNum, trimestresRequis);
  // Décote basée sur le total de trimestres tous régimes confondus
  // (fonction publique + autres régimes saisis), avec le plafond propre à la
  // fonction publique (-25 %).
  //
  // ⚠️ decoteSurTrimestresPlafond25() est symétrique : au-delà de
  // trimestresRequis, elle renvoie une valeur positive qui n'est PAS une
  // surcote légitime (aucune porte d'éligibilité, aucun plafond à 5 % pour
  // la parentale) — écrêtée à 0 ci-dessous. La vraie surcote (classique +
  // parentale, exclusive pour ce régime) est calculée séparément plus bas
  // via surcoteTotale(). Cf. docs/audit/branchement-majorations-pension-finale.md
  // §1.b.
  const decoteTrimestres = Math.min(
    decoteSurTrimestresPlafond25(trimestresLiquidablesNum + trimestresAutresRegimes, trimestresRequis),
    0
  );

  // La décote basée sur l'âge n'est prise en compte que si un départ
  // anticipé catégorie active est explicitement saisi (âge de départ +
  // âge d'annulation de la décote) : sans ces deux âges, il n'y a pas de
  // notion de "départ" dans cette section (même principe que le régime
  // général dans Carriere.tsx, qui n'applique decoteSurAge que dans la
  // simulation d'âge de l'onglet Optimisation, pas ici).
  const decoteAgeUtilisable =
    departAnticipeCategorieActive && !Number.isNaN(ageDepartAnticipeNum) && !Number.isNaN(ageAnnulationDecoteNum);
  const decote = decoteAgeUtilisable
    ? decoteApplicable(
        decoteTrimestres,
        decoteSurAgeFonctionPublique(ageDepartAnticipeNum, ageAnnulationDecoteNum)
      )
    : decoteTrimestres;

  const pensionCalculee = pensionBaseFonctionPublique(tib, taux, decote);
  const minimumGarantiValue = minimumGaranti(
    trimestresLiquidablesNum,
    trimestresRequis,
    VALEUR_REFERENCE_MIGA_ANNUELLE_2025,
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
  const trimestresCotisesAnneeReference = 0;
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    trimestresCotisesAnneeReference,
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReference
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
  const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
    pensionApresSurcote,
    majorationEnfantsPct,
    tib
  );

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
      <CardHeader>
        <CardTitle>Carrière fonction publique</CardTitle>
        <CardDescription>
          À cocher si une partie de votre carrière a été effectuée dans la fonction publique
          (polypensionné)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has-fonction-publique"
            checked={hasFonctionPublique}
            onCheckedChange={(checked) => onHasFonctionPubliqueChange(checked === true)}
          />
          <label htmlFor="has-fonction-publique" className="text-sm">
            J'ai eu une carrière dans la fonction publique
          </label>
        </div>

        {hasFonctionPublique && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tib">Traitement indiciaire brut annuel (€)</Label>
                <Input
                  id="tib"
                  type="number"
                  placeholder="Ex: 36000"
                  value={traitementIndiciaireBrut}
                  onChange={(e) => setTraitementIndiciaireBrut(e.target.value)}
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Dernier indice détenu depuis au moins 6 mois avant cessation, en équivalent annuel
                  (traitement mensuel × 12).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trimestres-liquidables-fp">
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

              <div className="space-y-2">
                <Label htmlFor="points-rafp">Points RAFP déjà accumulés</Label>
                <Input
                  id="points-rafp"
                  type="number"
                  placeholder="Ex: 4200"
                  value={pointsRAFP}
                  onChange={(e) => setPointsRAFP(e.target.value)}
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

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depart-pour-invalidite"
                  checked={departPourInvalidite}
                  onCheckedChange={(checked) => setDepartPourInvalidite(checked === true)}
                />
                <label htmlFor="depart-pour-invalidite" className="text-sm">
                  Départ pour invalidité (moins de 15 ans de services)
                </label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Change le mode de calcul du minimum garanti pour une durée de services inférieure
                à 15 ans (référentiel §7.5) — sans effet à 15 ans de services ou plus.
              </p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depart-anticipe-categorie-active"
                  checked={departAnticipeCategorieActive}
                  onCheckedChange={(checked) => setDepartAnticipeCategorieActive(checked === true)}
                />
                <label htmlFor="depart-anticipe-categorie-active" className="text-sm">
                  Départ anticipé catégorie active
                </label>
              </div>

              {departAnticipeCategorieActive && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="age-depart-anticipe">Âge de départ anticipé</Label>
                    <Input
                      id="age-depart-anticipe"
                      type="number"
                      placeholder="Ex: 57"
                      value={ageDepartAnticipe}
                      onChange={(e) => setAgeDepartAnticipe(e.target.value)}
                      className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age-annulation-decote">Âge d'annulation de la décote</Label>
                    <Input
                      id="age-annulation-decote"
                      type="number"
                      placeholder="Ex: 62"
                      value={ageAnnulationDecote}
                      onChange={(e) => setAgeAnnulationDecote(e.target.value)}
                      className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Pension fonction publique</div>
                <div className="text-xl font-semibold text-primary">
                  {formatEuro2(pensionFinale)} / an
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculée : {formatEuro2(pensionCalculee)} / an · Minimum garanti :{' '}
                  {formatEuro2(minimumGarantiValue)} / an
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum garanti calculé sur la valeur de référence 2025 (1 248,33 €/mois,
                  indice majoré 227) — la valeur 2026 n'est pas encore confirmée par une source
                  opposable.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">RAFP</div>
                <div className="text-xl font-semibold text-primary">
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
