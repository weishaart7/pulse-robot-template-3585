import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { Personne } from '@/hooks/useRetraiteData';

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

interface CartePensionProps {
  personne: Personne;
  nom: string;
}

const CartePension = ({ personne, nom }: CartePensionProps) => {
  const { pensionTotaleConsolidee, ageTauxPlein, loading, aDesDonnees } = usePensionConsolidee(personne);

  // Conjoint : carte affichée seulement "si son profil existe et contient
  // des données retraite" (cf. consigne) — "profil existe" est déjà garanti
  // par hasConjoint côté Synthese ci-dessous, "contient des données" est
  // vérifié ici une fois le chargement terminé. Pas de message "aucune
  // donnée" pour le conjoint : contrairement à l'utilisateur, rien n'invite
  // le conseiller à remplir un onglet Carrière "conjoint" s'il n'en a pas
  // encore ouvert la conversation avec le client.
  if (personne === 'conjoint' && !loading && !aDesDonnees) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">
          Pension à l'âge du taux plein — {nom}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : !aDesDonnees ? (
          <p className="text-xs text-muted-foreground">
            Aucune donnée de carrière saisie pour l'instant (onglet Carrière).
          </p>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {formatEuro0(pensionTotaleConsolidee)} / an
            </div>
            <p className="text-xs text-muted-foreground">{ageTauxPlein}</p>
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

export const Synthese = ({ hasConjoint, nomUtilisateur, nomConjoint }: SyntheseProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CartePension personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint && <CartePension personne="conjoint" nom={nomConjoint} />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CarteTrimestresManquants personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint && <CarteTrimestresManquants personne="conjoint" nom={nomConjoint} />}
      </div>

      <CarteComplementsRetraite />
    </div>
  );
};
