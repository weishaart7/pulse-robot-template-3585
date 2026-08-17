import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { Personne } from '@/hooks/useRetraiteData';
import { exporterSyntheseRetraitePDF, DonneesPersonneExportPDF } from '@/lib/retraite/exportSyntheseRetraitePDF';

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
    <Card>
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">
          Pension à l'âge du taux plein
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
    <Card>
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
  <Card>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CarteTrimestresManquants personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint && <CarteTrimestresManquants personne="conjoint" nom={nomConjoint} />}
      </div>

      <CarteComplementsRetraite />
    </div>
  );
};
