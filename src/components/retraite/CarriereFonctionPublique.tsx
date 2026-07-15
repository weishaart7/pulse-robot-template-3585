import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { tauxProratisation, decoteApplicable, pensionComplementaireAnnuelle } from '@/lib/retraite/calcul';
import {
  pensionBaseFonctionPublique,
  decoteSurTrimestresFonctionPublique,
  decoteSurAgeFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
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
  // Trimestres validés régime général (Carriere.tsx) : la décote fonction
  // publique se base sur le total tous régimes, pas seulement les trimestres
  // fonction publique isolés.
  trimestresValidesRegimeGeneral: number;
  // Remontés au parent (Carriere.tsx) car le total de trimestres tous
  // régimes doit aussi alimenter la décote du régime général — un state
  // purement local ici ne serait pas visible du composant frère.
  hasFonctionPublique: boolean;
  onHasFonctionPubliqueChange: (value: boolean) => void;
  trimestresLiquidables: string;
  onTrimestresLiquidablesChange: (value: string) => void;
  // Reporte les résultats déjà calculés ici (pas les entrées brutes) au
  // parent, pour le total consolidé tous régimes de Carriere.tsx — évite de
  // dupliquer la logique de calcul FP ou de remonter le TIB/les points RAFP/
  // les âges catégorie active, qui restent propres à ce composant.
  onResultChange?: (result: { pensionFinale: number; rafpAnnuelle: number }) => void;
}

export const CarriereFonctionPublique = ({
  trimestresRequis,
  trimestresValidesRegimeGeneral,
  hasFonctionPublique,
  onHasFonctionPubliqueChange,
  trimestresLiquidables,
  onTrimestresLiquidablesChange,
  onResultChange,
}: CarriereFonctionPubliqueProps) => {
  const [traitementIndiciaireBrut, setTraitementIndiciaireBrut] = useState<string>('');
  const [pointsRAFP, setPointsRAFP] = useState<string>('');
  const [departAnticipeCategorieActive, setDepartAnticipeCategorieActive] = useState(false);
  const [ageDepartAnticipe, setAgeDepartAnticipe] = useState<string>('');
  const [ageAnnulationDecote, setAgeAnnulationDecote] = useState<string>('');

  const tib = parseFloat(traitementIndiciaireBrut) || 0;
  const trimestresLiquidablesNum = parseInt(trimestresLiquidables) || 0;
  const pointsRAFPNum = parseFloat(pointsRAFP) || 0;
  const ageDepartAnticipeNum = parseFloat(ageDepartAnticipe);
  const ageAnnulationDecoteNum = parseFloat(ageAnnulationDecote);

  const taux = tauxProratisation(trimestresLiquidablesNum, trimestresRequis);
  // Décote basée sur le total de trimestres tous régimes confondus
  // (fonction publique + régime général), avec le plafond propre à la
  // fonction publique (-25 %).
  const decoteTrimestres = decoteSurTrimestresFonctionPublique(
    trimestresLiquidablesNum + trimestresValidesRegimeGeneral,
    trimestresRequis
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
  const minimumGarantiValue = minimumGaranti(trimestresLiquidablesNum, trimestresRequis);
  const pensionFinale = pensionFonctionPubliqueFinale(pensionCalculee, minimumGarantiValue);

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
