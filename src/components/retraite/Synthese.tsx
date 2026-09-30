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
  ResultatNetRetraiteFoyer,
} from '@/lib/retraite/calculNetRetraite';
import { TrancheCSGPension } from '@/lib/retraite/parametres';
import {
  pensionsBrutes,
  foyerSansEnfantsACharge,
  FOYER_PAR_DEFAUT,
  remplacement,
  lignesRevenuNet,
} from '@/lib/retraite/revenuNetFoyer';
import { reversionPourSurvivant, statutCoupleDepuisLibelle, StatutCouple, DetailReversion } from '@/lib/retraite/calculReversion';

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
  /** Libellé `marital_status.statut_couple` (réversion : mariage seul). */
  statutCouple?: string;
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
                  {utilisateur.dateCarriereLongue && utilisateur.dateEffet &&
                    utilisateur.dateCarriereLongue.getTime() < utilisateur.dateEffet.getTime() && (
                      <p className="text-xs text-positive">
                        Carrière longue : départ anticipé à taux plein possible dès le{' '}
                        {utilisateur.dateCarriereLongue.toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (onglet Optimisation)
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
  const lignes = lignesRevenuNet(utilisateur, avecConjoint ? conjoint : null, foyerSaisi, nomUtilisateur, nomConjoint);

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

interface CarteConjointSurvivantProps extends CartePensionFoyerProps {
  statutCouple?: string;
}

// Revenu du survivant : sa pension propre + la réversion, imposé seul (veuf
// si marié, célibataire sinon — 1 part, sans enfant à charge).
const revenuSurvivant = (survivant: ResultatPersonne, defunt: ResultatPersonne, statut: StatutCouple) => {
  const propres = pensionsBrutes(survivant);
  const reversion = reversionPourSurvivant(defunt.assietteReversion, survivant.pensionTotaleConsolidee, statut);
  const situation: FoyerFiscalInput['situationFamille'] = statut === 'marie' ? 'veuf' : 'celibataire';
  const net = calculerNetRetraiteFoyer(
    [
      {
        base: propres.base + reversion.regimeGeneral + reversion.cnavpl + reversion.fonctionPublique + reversion.rafp,
        complementaires: propres.complementaires + reversion.agircArrco,
      },
    ],
    calculerPartsFiscales(foyerSansEnfantsACharge(FOYER_PAR_DEFAUT, situation)),
    situation
  );
  return { reversion, net };
};

const DetailSurvivant = ({
  titre,
  pensionPropre,
  reversion,
  net,
  netCoupleMensuel,
}: {
  titre: string;
  pensionPropre: number;
  reversion: DetailReversion;
  net: ResultatNetRetraiteFoyer;
  netCoupleMensuel: number;
}) => {
  const perte = netCoupleMensuel - net.netMensuel;
  const detail = (
    [
      ['Régime général', reversion.regimeGeneral],
      ['Agirc-Arrco', reversion.agircArrco],
      ['Fonction publique', reversion.fonctionPublique],
      ['RAFP', reversion.rafp],
      ['CNAVPL', reversion.cnavpl],
    ] as [string, number][]
  )
    .filter(([, montant]) => montant > 0)
    .map(([libelle, montant]) => `${libelle} ${formatEuro0(montant)}`)
    .join(', ');
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{titre}</p>
      <div className="text-2xl font-bold text-primary">{formatEuro0(net.netMensuel)} / mois net</div>
      <p className="text-xs text-muted-foreground">
        Pension propre {formatEuro0(pensionPropre)} / an + réversion {formatEuro0(reversion.total)} / an
        {detail && <> ({detail})</>}
      </p>
      {reversion.reduiteParPlafondRessources && (
        <p className="text-xs text-muted-foreground">
          Réversion du régime général réduite par le plafond de ressources (25 001,60 €/an pour une personne seule).
        </p>
      )}
      {netCoupleMensuel > 0 && (
        <p className="text-xs">
          Baisse du revenu net du foyer :{' '}
          <span className="font-semibold text-destructive">−{formatEuro0(perte)} / mois</span> ({formatPct(perte / netCoupleMensuel)})
        </p>
      )}
    </div>
  );
};

const CarteConjointSurvivant = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: CarteConjointSurvivantProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const { data: foyerFiscal, loading: loadingFoyer } = useFoyerFiscal();
  const statut = statutCoupleDepuisLibelle(statutCouple);

  if (
    !hasConjoint ||
    !statut ||
    utilisateur.loading ||
    conjoint.loading ||
    loadingFoyer ||
    !utilisateur.aDesDonnees ||
    !conjoint.aDesDonnees
  ) {
    return null;
  }

  const netCoupleMensuel = lignesRevenuNet(utilisateur, conjoint, foyerFiscal ?? null, nomUtilisateur, nomConjoint).reduce(
    (total, l) => total + l.resultat.netMensuel,
    0
  );
  const survivantConjoint = revenuSurvivant(conjoint, utilisateur, statut);
  const survivantUtilisateur = revenuSurvivant(utilisateur, conjoint, statut);

  return (
    <Card className="border border-border">
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">Protection du conjoint survivant</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        {statut !== 'marie' && (
          <p className="text-xs rounded-lg border border-destructive/40 p-3 text-destructive">
            {statut === 'pacse' ? 'PACS' : 'Concubinage'} : aucune pension de réversion n'est versée, dans aucun régime.
            Seul le mariage ouvre ce droit — le survivant ne garde que sa propre pension.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Revenu net du couple retraité : {formatEuro0(netCoupleMensuel)} / mois.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailSurvivant
            titre={`Décès de ${nomUtilisateur} — revenu de ${nomConjoint}`}
            pensionPropre={conjoint.pensionTotaleConsolidee}
            reversion={survivantConjoint.reversion}
            net={survivantConjoint.net}
            netCoupleMensuel={netCoupleMensuel}
          />
          <DetailSurvivant
            titre={`Décès de ${nomConjoint} — revenu de ${nomUtilisateur}`}
            pensionPropre={utilisateur.pensionTotaleConsolidee}
            reversion={survivantUtilisateur.reversion}
            net={survivantUtilisateur.net}
            netCoupleMensuel={netCoupleMensuel}
          />
        </div>
        <div className="space-y-1 pt-3 border-t text-xs text-muted-foreground">
          <p>
            Hypothèses : les deux conjoints sont retraités ; le survivant a au moins 55 ans, vit seul et ne se remarie
            pas. Ressources prises en compte pour le plafond du régime général : ses seules pensions (revenus du
            patrimoine ignorés — réversion possiblement surestimée).
          </p>
          <p>
            Non modélisés : majoration de 11,1 % des petites pensions après 65 ans, partage entre ex-conjoints,
            réversion des autres régimes à points (RCI, Ircantec…). Réversion CNAVPL alignée sur le régime général, à
            confirmer.
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

export const Synthese = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: SyntheseProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <BoutonExportPDF hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />
      </div>

      <CartePensionFoyer hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />

      <CarteRevenuNet hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />

      <CarteConjointSurvivant
        hasConjoint={hasConjoint}
        nomUtilisateur={nomUtilisateur}
        nomConjoint={nomConjoint}
        statutCouple={statutCouple}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CarteTrimestresManquants personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint && <CarteTrimestresManquants personne="conjoint" nom={nomConjoint} />}
      </div>

      <CarteComplementsRetraite />
    </div>
  );
};
