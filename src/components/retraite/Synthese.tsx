import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { Personne } from '@/hooks/useRetraiteData';
import { exporterSyntheseRetraitePDF, DonneesPersonneExportPDF } from '@/lib/retraite/exportSyntheseRetraitePDF';
import { useFoyerFiscal } from '@/hooks/useFoyerFiscal';
import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';
import {
  calculerNetRetraiteFoyer,
  tauxRemplacementBrut,
  PensionsBrutesPersonne,
  ResultatNetRetraiteFoyer,
} from '@/lib/retraite/calculNetRetraite';
import { TrancheCSGPension } from '@/lib/retraite/parametres';

const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

interface SyntheseProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

interface CartePensionFoyerProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

// Une seule carte pour les deux pensions (utilisateur, conjoint) + le total
// du foyer — remplace les deux cartes séparées d'origine (cf. consigne).
const CartePensionFoyer = ({ hasConjoint, nomUtilisateur, nomConjoint }: CartePensionFoyerProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');

  const loading = utilisateur.loading || (hasConjoint && conjoint.loading);
  // Même règle d'affichage que précédemment pour le conjoint : sa ligne
  // n'apparaît que si son profil existe et contient des données retraite.
  const afficherConjoint = hasConjoint && !conjoint.loading && conjoint.aDesDonnees;

  const pensionCumulee =
    (utilisateur.aDesDonnees ? utilisateur.pensionTotaleConsolidee : 0) +
    (afficherConjoint ? conjoint.pensionTotaleConsolidee : 0);

  return (
    <Card className="border border-border">
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">
          Pension au départ à l'âge légal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{nomUtilisateur}</p>
              {!utilisateur.aDesDonnees ? (
                <p className="text-xs text-muted-foreground">
                  Aucune donnée de carrière saisie pour l'instant (onglet Carrière).
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {formatEuro0(utilisateur.pensionTotaleConsolidee)} / an
                  </div>
                  <p className="text-xs text-muted-foreground">{utilisateur.ageTauxPlein}</p>
                  {utilisateur.dateEffet && (
                    <p className="text-xs text-muted-foreground">
                      Départ simulé au {utilisateur.dateEffet.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}
                    </p>
                  )}
                  {utilisateur.repartitionParRegime.rafpCapital > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + capital RAFP de {formatEuro0(utilisateur.repartitionParRegime.rafpCapital)} au départ
                    </p>
                  )}
                  {utilisateur.salaireComplementaireEstPlafonne && (
                    <p className="text-xs text-spark">
                      Agirc-Arrco projeté sur un revenu plafonné au PASS (salaire brut total non renseigné).
                    </p>
                  )}
                </div>
              )}
            </div>

            {afficherConjoint && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{nomConjoint}</p>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {formatEuro0(conjoint.pensionTotaleConsolidee)} / an
                  </div>
                  <p className="text-xs text-muted-foreground">{conjoint.ageTauxPlein}</p>
                  {conjoint.dateEffet && (
                    <p className="text-xs text-muted-foreground">
                      Départ simulé au {conjoint.dateEffet.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {afficherConjoint && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Pension cumulée du foyer</p>
                <div className="text-2xl font-bold text-primary">
                  {formatEuro0(pensionCumulee)} / an
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LIBELLE_TRANCHE_CSG: Record<TrancheCSGPension, string> = {
  exoneration: 'exonéré de CSG',
  tauxReduit: 'CSG à 3,8 %',
  tauxMedian: 'CSG à 6,6 %',
  tauxNormal: 'CSG à 8,3 %',
};

const formatPct = (valeur: number) => `${(valeur * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;

type ResultatPersonne = ReturnType<typeof usePensionConsolidee>;

// Pensions brutes séparées base / complémentaires (cotisation maladie de 1 %
// sur les seules complémentaires : Agirc-Arrco et autres régimes à points).
const pensionsBrutes = (r: ResultatPersonne): PensionsBrutesPersonne => ({
  base: r.pensionTotaleConsolidee - r.repartitionParRegime.complementaireRegimeGeneral,
  complementaires: r.repartitionParRegime.complementaireRegimeGeneral,
});

// Situation « foyer fiscal à la retraite » (décision du 2026-09-29) : celle
// enregistrée dans le module Fiscalité, sans les enfants à charge (plus à
// charge au départ en retraite — choix prudent, l'impôt ne peut être que
// surestimé).
const foyerSansEnfantsACharge = (foyer: FoyerFiscalInput, situationFamille: FoyerFiscalInput['situationFamille']): FoyerFiscalInput => ({
  ...foyer,
  situationFamille,
  enfantsCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
});

const FOYER_PAR_DEFAUT: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

const LigneNet = ({ titre, resultat, tauxRemplacement }: { titre: string; resultat: ResultatNetRetraiteFoyer; tauxRemplacement: number | null }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{titre}</p>
    <div className="text-2xl font-bold text-primary">{formatEuro0(resultat.netMensuel)} / mois net</div>
    <p className="text-xs text-muted-foreground">
      Brut {formatEuro0(resultat.pensionsBrutes)} / an − prélèvements sociaux {formatEuro0(resultat.prelevementsSociaux)}{' '}
      ({LIBELLE_TRANCHE_CSG[resultat.tranche]}) − impôt {formatEuro0(resultat.impot)} (TMI {formatPct(resultat.tmi)}) ={' '}
      {formatEuro0(resultat.netAnnuel)} / an
    </p>
    {tauxRemplacement !== null && (
      <p className="text-xs text-muted-foreground">
        Taux de remplacement brut : {formatPct(tauxRemplacement)} du dernier revenu d'activité brut
      </p>
    )}
  </div>
);

const CarteRevenuNet = ({ hasConjoint, nomUtilisateur, nomConjoint }: CartePensionFoyerProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const { data: foyerFiscal, loading: loadingFoyer } = useFoyerFiscal();

  if (utilisateur.loading || (hasConjoint && conjoint.loading) || loadingFoyer || !utilisateur.aDesDonnees) {
    return null;
  }

  const avecConjoint = hasConjoint && conjoint.aDesDonnees;
  const foyerSaisi = foyerFiscal ?? null;
  const impositionCommune =
    avecConjoint && (foyerSaisi?.situationFamille === 'marie' || foyerSaisi?.situationFamille === 'pacse');

  const remplacement = (r: ResultatPersonne) => tauxRemplacementBrut(r.pensionTotaleConsolidee, r.revenuActiviteBrutReference);

  let lignes: { titre: string; resultat: ResultatNetRetraiteFoyer; tauxRemplacement: number | null }[];
  if (impositionCommune && foyerSaisi) {
    const foyer = foyerSansEnfantsACharge(foyerSaisi, foyerSaisi.situationFamille);
    lignes = [
      {
        titre: `Foyer fiscal commun (${nomUtilisateur} et ${nomConjoint})`,
        resultat: calculerNetRetraiteFoyer(
          [pensionsBrutes(utilisateur), pensionsBrutes(conjoint)],
          calculerPartsFiscales(foyer),
          foyer.situationFamille
        ),
        tauxRemplacement: null,
      },
    ];
  } else {
    // Foyers séparés : concubins, ou foyer fiscal non renseigné dans Fiscalité.
    const situationUtilisateur =
      foyerSaisi && !['marie', 'pacse'].includes(foyerSaisi.situationFamille) ? foyerSaisi.situationFamille : 'celibataire';
    const foyerUtilisateur = foyerSansEnfantsACharge(foyerSaisi ?? FOYER_PAR_DEFAUT, situationUtilisateur);
    const foyerConjoint = foyerSansEnfantsACharge(FOYER_PAR_DEFAUT, 'celibataire');
    lignes = [
      {
        titre: nomUtilisateur,
        resultat: calculerNetRetraiteFoyer([pensionsBrutes(utilisateur)], calculerPartsFiscales(foyerUtilisateur), situationUtilisateur),
        tauxRemplacement: remplacement(utilisateur),
      },
      ...(avecConjoint
        ? [
            {
              titre: nomConjoint,
              resultat: calculerNetRetraiteFoyer([pensionsBrutes(conjoint)], calculerPartsFiscales(foyerConjoint), 'celibataire' as const),
              tauxRemplacement: remplacement(conjoint),
            },
          ]
        : []),
    ];
  }

  return (
    <Card className="border border-border">
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">Revenu net à la retraite</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        {lignes.map((l) => (
          <LigneNet key={l.titre} {...l} />
        ))}
        {impositionCommune && (
          <p className="text-xs text-muted-foreground">
            Taux de remplacement brut : {nomUtilisateur}{' '}
            {remplacement(utilisateur) !== null ? formatPct(remplacement(utilisateur)!) : 'non calculable'} · {nomConjoint}{' '}
            {remplacement(conjoint) !== null ? formatPct(remplacement(conjoint)!) : 'non calculable'}
          </p>
        )}
        <div className="space-y-1 pt-3 border-t text-xs text-muted-foreground">
          {!foyerSaisi && (
            <p className="text-spark">
              Foyer fiscal non renseigné dans le module Fiscalité : chaque personne est imposée séparément, sur 1 part.
            </p>
          )}
          <p>
            Régime de croisière : la CSG est calculée sur le revenu fiscal des seules pensions. Les deux premières années,
            le revenu fiscal de référence (N-2) contient encore des salaires : taux de CSG souvent plus élevé.
          </p>
          <p>
            Revenus du foyer limités aux pensions (loyers, dividendes et rachats d'assurance-vie non inclus : tranche
            d'imposition possiblement sous-estimée) ; enfants à charge non retenus dans les parts.
            {avecConjoint && ' Les deux conjoints sont supposés retraités.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface CarteTrimestresManquantsProps {
  personne: Personne;
  nom: string;
}

const CarteTrimestresManquants = ({ personne, nom }: CarteTrimestresManquantsProps) => {
  const { trimestresRequis, trimestresValidesTousRegimes, loading, aDesDonnees } = usePensionConsolidee(personne);

  // Même règle d'affichage que CartePension ci-dessus pour le conjoint.
  if (personne === 'conjoint' && !loading && !aDesDonnees) {
    return null;
  }

  const trimestresManquants = trimestresRequis - trimestresValidesTousRegimes;
  // 4 trimestres/an, en supposant une cotisation continue au rythme actuel —
  // pas de simulation d'interruption de carrière, cf. consigne.
  const anneesRestantes = trimestresManquants > 0 ? trimestresManquants / 4 : 0;

  return (
    <Card className="border border-border">
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">
          Trimestres manquants — {nom}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : !aDesDonnees ? (
          <p className="text-xs text-muted-foreground">
            Aucune donnée de carrière saisie pour l'instant (onglet Carrière).
          </p>
        ) : trimestresManquants <= 0 ? (
          <p className="text-sm font-semibold text-primary">
            Trimestres requis déjà atteints ({trimestresValidesTousRegimes} / {trimestresRequis})
          </p>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{trimestresManquants} trimestres</div>
            <p className="text-xs text-muted-foreground">
              Soit environ {anneesRestantes.toFixed(1).replace('.0', '')} an{anneesRestantes >= 2 ? 's' : ''} à
              cotisation continue au rythme actuel (4 trimestres/an).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CarteComplementsRetraite = () => (
  <Card className="border border-border">
    <CardHeader className="p-5">
      <CardTitle className="text-[15px] font-semibold tracking-tight">Compléments de retraite</CardTitle>
      <CardDescription className="text-xs">PER, assurance-vie et autres épargnes retraite</CardDescription>
    </CardHeader>
    <CardContent className="p-5 pt-0">
      <div className="text-2xl font-bold text-muted-foreground">0 €</div>
      <p className="text-xs text-muted-foreground mt-1">
        Calcul détaillé à venir — ce montant n'est pas encore une estimation.
      </p>
    </CardContent>
  </Card>
);

interface BoutonExportPDFProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

const BoutonExportPDF = ({ hasConjoint, nomUtilisateur, nomConjoint }: BoutonExportPDFProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const [exportEnCours, setExportEnCours] = useState(false);

  const loading = utilisateur.loading || (hasConjoint && conjoint.loading);
  const afficherConjoint = hasConjoint && !conjoint.loading && conjoint.aDesDonnees;

  const handleExport = async () => {
    setExportEnCours(true);
    try {
      const donneesUtilisateur: DonneesPersonneExportPDF = { ...utilisateur, nom: nomUtilisateur };
      const donneesConjoint: DonneesPersonneExportPDF | null = afficherConjoint
        ? { ...conjoint, nom: nomConjoint }
        : null;

      await exporterSyntheseRetraitePDF({
        utilisateur: donneesUtilisateur,
        conjoint: donneesConjoint,
        dateGeneration: new Date(),
      });
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={loading || !utilisateur.aDesDonnees || exportEnCours}
      onClick={handleExport}
    >
      <Download className="h-4 w-4" />
      {exportEnCours ? 'Génération en cours…' : 'Exporter en PDF'}
    </Button>
  );
};

export const Synthese = ({ hasConjoint, nomUtilisateur, nomConjoint }: SyntheseProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <BoutonExportPDF hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />
      </div>

      <CartePensionFoyer hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />

      <CarteRevenuNet hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CarteTrimestresManquants personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint && <CarteTrimestresManquants personne="conjoint" nom={nomConjoint} />}
      </div>

      <CarteComplementsRetraite />
    </div>
  );
};
