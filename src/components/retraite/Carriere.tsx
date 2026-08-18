import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, Trash2, Pencil, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useHypotheseRevenuFutur, UseHypotheseRevenuFuturResult } from '@/hooks/useHypotheseRevenuFutur';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { useToast } from '@/hooks/use-toast';
import { parseRIS, PeriodeCarriere, RegimeDetecte, LIBELLE_TYPE_ACTIVITE } from '@/lib/retraite/parseRIS';
import { estRegimeSaisieManuelle } from '@/lib/retraite/regimesSaisieManuelle';
import { RISImportDialog } from '@/components/retraite/RISImportDialog';
import { PeriodeCarriereEditDialog } from '@/components/retraite/PeriodeCarriereEditDialog';
import {
  pensionComplementaireAnnuelle,
  trimestresRequisPourGeneration,
} from '@/lib/retraite/calcul';
import { calculerPensionConsolidee, EntreePensionConsolidee } from '@/lib/retraite/pensionConsolidee';
import { calculerProjectionRevenuFutur } from '@/lib/retraite/hypotheseRevenuFutur';
import { CarriereFonctionPublique } from '@/components/retraite/CarriereFonctionPublique';
import { CarriereCNAVPL, VALEUR_POINT_CNAVPL_2026 } from '@/components/retraite/CarriereCNAVPL';
import { useProfilFamilialRetraite } from '@/hooks/useProfilFamilialRetraite';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';

// Seuil de tolérance pour l'indicateur de cohérence RIS ↔ carrière saisie
// (cf. ci-dessous, section "Détail de carrière") : un écart de 4 trimestres
// ou moins (l'équivalent d'une seule année civile) peut s'expliquer par les
// limites connues et documentées de trimestresCotisesEtAssimilesDepuisCarriere()
// (sous-type micro-entrepreneur non identifiable depuis un libellé atypique,
// heuristique indemnisé/non-indemnisé sur texte libre, extension à 5 ans du
// chômage non indemnisé non implémentée, arrondis par floor() par année) sans
// qu'il s'agisse d'une carrière réellement incomplète. Au-delà, l'écart
// dépasse ce que ces limites peuvent plausiblement expliquer à elles seules
// et mérite un vrai regard sur la carrière saisie — cf.
// docs/audit/audit-retraite.md pour le détail de ce choix.
const SEUIL_ECART_COHERENCE_TRIMESTRES = 4;

const formatDateFr = (dateIso: string) => {
  const [annee, mois, jour] = dateIso.split('-');
  return `${jour}/${mois}/${annee}`;
};

const formatEuro0Hypothese = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

interface ToggleHypotheseRevenuFuturProps {
  personne: Personne;
  hypothese: UseHypotheseRevenuFuturResult;
}

// Hypothèse de revenu pour les années futures manquantes (entre l'année en
// cours et l'âge légal réel) — alimente désormais directement le calcul de
// pension affiché par Carriere.tsx en plus de celui de Synthèse (cf.
// docs/audit/audit-pension-consolidation.md, étape 2 de la fusion), via
// calculerProjectionRevenuFutur(). Le hook lui-même (`hypothese`) est
// désormais appelé une seule fois, par le composant parent `Carriere`, et
// transmis ici en props plutôt qu'appelé à nouveau localement — évite un
// second jeu de requêtes retraite_data/retraite_carriere_detail redondant
// avec celui de Carriere (étape 3 de la fusion).
const ToggleHypotheseRevenuFutur = ({ personne, hypothese }: ToggleHypotheseRevenuFuturProps) => {
  const { loading, mode, setMode, valeurCalculee, valeurManuelle, setValeurManuelle, saveStatus, saveNow } =
    hypothese;

  // Flush explicite quand le mode change plutôt qu'un saveNow() synchrone
  // dans le onClick : setMode() ne fait que planifier le re-render, saveNow()
  // lirait alors encore le mode PRÉCÉDENT (saveRef.current n'est mis à jour
  // qu'au rendu suivant) — cet effet, lui, se déclenche après que le
  // changement d'état a été appliqué, ce qui garantit que la valeur flushée
  // est la bonne (cf. audit du 2026-08-18).
  useEffect(() => {
    if (!loading) saveNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (loading) return null;

  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
      <div>
        <Label className="text-xs">Hypothèse de revenu futur</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revenu hypothétique retenu pour les années entre aujourd'hui et l'âge légal, tant qu'aucune donnée de
          carrière réelle n'est disponible pour ces années.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'derniere_annee_connue' ? 'default' : 'outline'}
          size="sm"
          disabled={valeurCalculee === null}
          onClick={() => setMode('derniere_annee_connue')}
        >
          Dernière année connue
        </Button>
        <Button
          type="button"
          variant={mode === 'revenu_moyen_projete' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('revenu_moyen_projete')}
        >
          Revenu moyen projeté
        </Button>
      </div>

      {mode === 'derniere_annee_connue' ? (
        valeurCalculee !== null ? (
          <p className="text-sm font-semibold text-primary">{formatEuro0Hypothese(valeurCalculee)} / an</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Non calculable : aucune année du relevé de carrière n'a de trimestre validé.
          </p>
        )
      ) : (
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor={`revenu-hypothese-${personne}`} className="text-xs">
            Revenu annuel hypothétique (€)
          </Label>
          <Input
            id={`revenu-hypothese-${personne}`}
            type="number"
            placeholder="Ex: 30000"
            value={valeurManuelle}
            onChange={(e) => setValeurManuelle(e.target.value)}
            onBlur={saveNow}
            className="bg-background border-transparent shadow-none rounded-[5px] focus-visible:border-ring"
          />
        </div>
      )}

      {saveStatus === 'saving' && <p className="text-xs text-muted-foreground">Enregistrement…</p>}
    </div>
  );
};

interface CarriereProps {
  // Colonne conjoint (cf. RetraiteSection.tsx / ColonnesPersonnes.tsx) :
  // même composant, deuxième instance, données routées vers la ligne
  // 'conjoint' de retraite_data/retraite_carriere_detail (même user_id, pas
  // de compte séparé — cf. migration
  // 20260815000000_add_personne_to_retraite_tables.sql).
  personne?: Personne;
}

export const Carriere = ({ personne = 'utilisateur' }: CarriereProps = {}) => {
  const { data, loading, saveRetraiteData } = useRetraiteData(personne);
  const {
    periodes: periodesEnregistrees,
    loading: loadingCarriereDetail,
    remplacerPeriodes,
  } = useCarriereDetail(personne);
  const { toast } = useToast();
  const [salaireAnnuelMoyen, setSalaireAnnuelMoyen] = useState<string>('');
  const [trimestresValides, setTrimestresValides] = useState<string>('');
  // 172 : valeur par défaut affichée avant chargement du profil famille
  // (génération 1969+, la plus fréquente pour un client actif aujourd'hui),
  // recalculée dès que la date de naissance est connue — cf. l'effet plus
  // bas. Auparavant une constante figée en permanence : écart #2/#3 de
  // l'audit référentiel (docs/audit/audit-retraite.md §7).
  const [trimestresRequis, setTrimestresRequis] = useState<number>(172);
  // Condition n°1 (déclarative) de la surcote parentale (référentiel §2.3.2,
  // écart #6) — option B actée : champ déclaratif simple, pas de
  // sous-système de répartition MDA par enfant. Branchée sur la pension
  // affichée via surcoteParentale()/surcoteTotale(), cf.
  // docs/audit/branchement-majorations-pension-finale.md.
  const [auMoinsUnTrimestreMajorationEnfant, setAuMoinsUnTrimestreMajorationEnfant] = useState(false);
  // Champ déclaratif pour l'écrêtement du MICO (référentiel §3.5.5, écart
  // #10) — pensions personnelles brutes d'autres régimes non modélisés par
  // cet outil (étranger, complémentaires non saisies...), mensuel, optionnel.
  // Persisté (colonne autres_pensions_mensuelles, cf. migration
  // 20260818000000) depuis la fusion documentée dans
  // docs/audit/audit-pension-consolidation.md — auparavant local et jamais
  // enregistré, ce qui faisait que Synthèse ignorait toujours ce champ même
  // quand un conseiller l'avait renseigné sur Carrière. Défaut vide → 0 →
  // comportement inchangé (aucune réduction) tant que le champ n'est pas
  // renseigné.
  const [autresPensionsMensuelles, setAutresPensionsMensuelles] = useState<string>('');

  // Carrière fonction publique — état remonté ici (plutôt que gardé local à
  // CarriereFonctionPublique) car le total de trimestres tous régimes doit
  // être partagé entre les calculs de décote de chaque régime (régime
  // général, fonction publique, CNAVPL), chacun gardant son propre plafond.
  const [hasFonctionPublique, setHasFonctionPublique] = useState(false);
  const [trimestresLiquidablesFP, setTrimestresLiquidablesFP] = useState<string>('');
  // Champs ci-dessous : lifté depuis CarriereFonctionPublique.tsx (état
  // purement local avant cette session, cf.
  // docs/audit/audit-fonction-publique-cnavpl.md) pour suivre le même
  // chemin de sauvegarde automatique que hasFonctionPublique/
  // trimestresLiquidablesFP ci-dessus.
  const [traitementIndiciaireBrut, setTraitementIndiciaireBrut] = useState<string>('');
  const [pointsRAFP, setPointsRAFP] = useState<string>('');
  const [departAnticipeCategorieActive, setDepartAnticipeCategorieActive] = useState(false);
  const [ageDepartAnticipe, setAgeDepartAnticipe] = useState<string>('');
  const [ageAnnulationDecote, setAgeAnnulationDecote] = useState<string>('');
  const [departPourInvalidite, setDepartPourInvalidite] = useState(false);
  const [anneeOuvertureDroits, setAnneeOuvertureDroits] = useState<string>('');

  // Carrière CNAVPL — même pattern que la fonction publique ci-dessus.
  const [hasCNAVPL, setHasCNAVPL] = useState(false);
  const [trimestresCNAVPL, setTrimestresCNAVPL] = useState<string>('');
  // Liftés depuis CarriereCNAVPL.tsx, même raison que ci-dessus.
  // valeurPointCNAVPL initialisée avec la même valeur par défaut
  // qu'auparavant (VALEUR_POINT_CNAVPL_2026, exportée par CarriereCNAVPL.tsx).
  const [pointsCNAVPL, setPointsCNAVPL] = useState<string>('');
  const [valeurPointCNAVPL, setValeurPointCNAVPL] = useState<string>(
    VALEUR_POINT_CNAVPL_2026.toString()
  );

  // Import RIS — le fichier n'est jamais conservé au-delà du parsing ni envoyé
  // à Supabase : il est lu en mémoire par parseRIS() puis abandonné.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [regimesDetectes, setRegimesDetectes] = useState<RegimeDetecte[]>([]);
  const [regimesPoints, setRegimesPoints] = useState<RegimeDetecte[]>([]);
  const [risDialogOpen, setRisDialogOpen] = useState(false);
  const [risImporting, setRisImporting] = useState(false);

  // Détail de carrière (import RIS) — periodesDetectees alimente le dialogue
  // de vérification (calcul du SAM), detailCarriere est la liste éditable
  // affichée dans la sous-section dédiée et effectivement enregistrée.
  const [periodesDetectees, setPeriodesDetectees] = useState<PeriodeCarriere[]>([]);
  const [detailCarriere, setDetailCarriere] = useState<PeriodeCarriere[]>([]);
  // Repliée par défaut : la liste période par période est une donnée brute
  // de contrôle, pas quelque chose à afficher d'emblée — l'utilisateur
  // clique pour la consulter au besoin.
  const [detailCarriereOuvert, setDetailCarriereOuvert] = useState(false);
  // Index de la période en cours de modification dans le dialogue dédié
  // (null = dialogue fermé) — un seul dialogue partagé pour toute la liste,
  // plutôt qu'un état par ligne.
  const [indexPeriodeEditee, setIndexPeriodeEditee] = useState<number | null>(null);

  // Date de naissance + liens familiaux — chargés une seule fois par
  // useProfilFamilialRetraite() (cf. docs/audit/audit-pension-consolidation.md,
  // étape 3 de la fusion), partagé avec usePensionConsolidee.ts plutôt que
  // rechargés séparément ici.
  const { dateNaissanceDetail, dateNaissanceISO, familyLinks } = useProfilFamilialRetraite(personne);
  // Année de naissance seule — nécessaire pour le dialogue d'import RIS
  // (calcul du SAM proposé, nombre d'années requis selon la génération).
  // Dérivée de dateNaissanceISO plutôt que rechargée séparément.
  const anneeNaissance = dateNaissanceISO ? new Date(dateNaissanceISO).getFullYear() : null;

  // Âge actuel : cet écran n'a pas de simulation de date de départ (à la
  // différence de l'onglet Optimisation) — le proxy de date d'effet retenu
  // pour cette carte est « aujourd'hui » (cf. l'effet trimestresRequis
  // ci-dessous), donc l'âge à comparer à l'âge du taux plein automatique
  // (decoteSurAge()) est l'âge actuel du client, pas un âge de départ simulé.
  const ageActuel = computeAge(dateNaissanceISO);

  // Trimestres requis pour le taux plein : résolus depuis la génération
  // réelle du client, plutôt que la constante 172 figée auparavant (écart
  // #2/#3 de l'audit référentiel). Proxy de date d'effet : « aujourd'hui »
  // (`new Date()`) — cet écran n'a pas de simulation d'âge de départ
  // (contrairement à l'onglet Optimisation) ; ajouter une vraie date de
  // liquidation saisie par l'utilisateur est réservé à la Session B, cf.
  // docs/audit/conception-date-effet.md (Option B).
  useEffect(() => {
    if (dateNaissanceDetail) {
      setTrimestresRequis(trimestresRequisPourGeneration(dateNaissanceDetail, new Date()));
    }
  }, [dateNaissanceDetail]);

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.salaire_annuel_moyen !== undefined && data.salaire_annuel_moyen !== null) {
        setSalaireAnnuelMoyen(data.salaire_annuel_moyen.toString());
      }
      if (data.trimestres_valides !== undefined && data.trimestres_valides !== null) {
        setTrimestresValides(data.trimestres_valides.toString());
      }
      if (data.regimes_points) {
        setRegimesPoints(data.regimes_points);
      }
      if (data.au_moins_un_trimestre_majoration_enfant !== undefined) {
        setAuMoinsUnTrimestreMajorationEnfant(data.au_moins_un_trimestre_majoration_enfant);
      }
      if (data.has_fonction_publique !== undefined) {
        setHasFonctionPublique(data.has_fonction_publique);
      }
      if (data.trimestres_liquidables_fp !== undefined && data.trimestres_liquidables_fp !== null) {
        setTrimestresLiquidablesFP(data.trimestres_liquidables_fp.toString());
      }
      if (data.has_cnavpl !== undefined) {
        setHasCNAVPL(data.has_cnavpl);
      }
      if (data.trimestres_cnavpl !== undefined && data.trimestres_cnavpl !== null) {
        setTrimestresCNAVPL(data.trimestres_cnavpl.toString());
      }
      if (data.traitement_indiciaire_brut !== undefined && data.traitement_indiciaire_brut !== null) {
        setTraitementIndiciaireBrut(data.traitement_indiciaire_brut.toString());
      }
      if (data.points_rafp !== undefined && data.points_rafp !== null) {
        setPointsRAFP(data.points_rafp.toString());
      }
      if (data.depart_anticipe_categorie_active !== undefined) {
        setDepartAnticipeCategorieActive(data.depart_anticipe_categorie_active);
      }
      if (data.age_depart_anticipe !== undefined && data.age_depart_anticipe !== null) {
        setAgeDepartAnticipe(data.age_depart_anticipe.toString());
      }
      if (data.age_annulation_decote !== undefined && data.age_annulation_decote !== null) {
        setAgeAnnulationDecote(data.age_annulation_decote.toString());
      }
      if (data.depart_pour_invalidite !== undefined) {
        setDepartPourInvalidite(data.depart_pour_invalidite);
      }
      if (data.annee_ouverture_droits !== undefined && data.annee_ouverture_droits !== null) {
        setAnneeOuvertureDroits(data.annee_ouverture_droits.toString());
      }
      if (data.points_cnavpl !== undefined && data.points_cnavpl !== null) {
        setPointsCNAVPL(data.points_cnavpl.toString());
      }
      if (data.valeur_point_cnavpl !== undefined && data.valeur_point_cnavpl !== null) {
        setValeurPointCNAVPL(data.valeur_point_cnavpl.toString());
      }
      if (data.autres_pensions_mensuelles !== undefined && data.autres_pensions_mensuelles !== null) {
        setAutresPensionsMensuelles(data.autres_pensions_mensuelles.toString());
      }
    }
  }, [data, loading]);

  // Chargement du détail de carrière déjà enregistré (table dédiée, à part
  // de retraite_data) — synchronisé dans l'état éditable local une fois
  // chargé, tant qu'aucun import RIS n'a encore modifié la liste localement.
  useEffect(() => {
    if (!loadingCarriereDetail) {
      setDetailCarriere(periodesEnregistrees.map(({ id: _id, ...periode }) => periode));
    }
  }, [loadingCarriereDetail, periodesEnregistrees]);

  // Sauvegarde automatique globale (option A retenue) : tout changement sur
  // cet écran — champs simples ou détail de carrière modifié via
  // PeriodeCarriereEditDialog — relance le même Promise.all après le
  // débounce, pour préserver l'atomicité entre retraite_data et
  // retraite_carriere_detail qu'avait le bouton "Enregistrer les
  // modifications" unique d'origine. JSON.stringify (plutôt que les
  // références de tableau) évite qu'un simple rechargement post-sauvegarde
  // de periodesEnregistrees (même contenu, nouvelle référence) ne redéclenche
  // une sauvegarde en boucle.
  const { status: saveStatus, saveNow } = useAutoSave(
    async () => {
      const [successRetraiteData, successDetailCarriere] = await Promise.all([
        saveRetraiteData(
          {
            salaire_annuel_moyen: parseFloat(salaireAnnuelMoyen) || 0,
            trimestres_valides: parseInt(trimestresValides) || 0,
            regimes_points: regimesPoints,
            au_moins_un_trimestre_majoration_enfant: auMoinsUnTrimestreMajorationEnfant,
            has_fonction_publique: hasFonctionPublique,
            trimestres_liquidables_fp: parseInt(trimestresLiquidablesFP) || 0,
            has_cnavpl: hasCNAVPL,
            trimestres_cnavpl: parseInt(trimestresCNAVPL) || 0,
            traitement_indiciaire_brut: parseFloat(traitementIndiciaireBrut) || 0,
            points_rafp: parseFloat(pointsRAFP) || 0,
            depart_anticipe_categorie_active: departAnticipeCategorieActive,
            age_depart_anticipe: parseFloat(ageDepartAnticipe) || null,
            age_annulation_decote: parseFloat(ageAnnulationDecote) || null,
            depart_pour_invalidite: departPourInvalidite,
            annee_ouverture_droits: anneeOuvertureDroits === '' ? null : parseInt(anneeOuvertureDroits, 10),
            points_cnavpl: parseFloat(pointsCNAVPL) || 0,
            valeur_point_cnavpl: parseFloat(valeurPointCNAVPL) || 0,
            autres_pensions_mensuelles: parseFloat(autresPensionsMensuelles) || 0,
          },
          { silent: true }
        ),
        remplacerPeriodes(detailCarriere),
      ]);
      return successRetraiteData && successDetailCarriere;
    },
    [
      salaireAnnuelMoyen,
      trimestresValides,
      JSON.stringify(regimesPoints),
      JSON.stringify(detailCarriere),
      auMoinsUnTrimestreMajorationEnfant,
      hasFonctionPublique,
      trimestresLiquidablesFP,
      hasCNAVPL,
      trimestresCNAVPL,
      traitementIndiciaireBrut,
      pointsRAFP,
      departAnticipeCategorieActive,
      ageDepartAnticipe,
      ageAnnulationDecote,
      departPourInvalidite,
      anneeOuvertureDroits,
      pointsCNAVPL,
      valeurPointCNAVPL,
      autresPensionsMensuelles,
    ]
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Autorise de resélectionner le même fichier après un annulé/échec précédent.
    e.target.value = '';
    if (!file) return;

    setRisImporting(true);
    try {
      const { regimes, detailCarriere: detailDetecte, texteIllisible } = await parseRIS(file);
      if (texteIllisible || regimes.length === 0) {
        toast({
          title: 'Import impossible',
          description: 'Impossible de lire ce document automatiquement, merci de saisir les informations manuellement.',
          variant: 'destructive',
        });
        return;
      }
      setRegimesDetectes(regimes);
      setPeriodesDetectees(detailDetecte);
      setRisDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la lecture du RIS:', error);
      toast({
        title: 'Import impossible',
        description: 'Impossible de lire ce document automatiquement, merci de saisir les informations manuellement.',
        variant: 'destructive',
      });
    } finally {
      setRisImporting(false);
    }
  };

  const handleValidateRIS = (
    regimesValides: RegimeDetecte[],
    detailCarriereValide: PeriodeCarriere[],
    samPropose: number | null
  ) => {
    // CNAVPL et fonction publique (SRE, CNRACL) ont chacun leur propre carte
    // dédiée (CarriereCNAVPL.tsx, CarriereFonctionPublique.tsx — décote/MIGA
    // spécifiques) : on les exclut explicitement des deux paniers génériques
    // ci-dessous (trimestres régime général ET regimesPoints), sinon un bloc
    // détecté dans le RIS gonflerait à tort trimestresValides (régime
    // général) et/ou serait compté deux fois si l'utilisateur ressaisit
    // aussi ses trimestres dans la carte dédiée — cette saisie reste
    // manuelle, comme RAFP, jamais auto-remplie depuis le RIS. Corrigé le
    // 2026-08-14 : la fonction publique en manquait, cf.
    // docs/audit/correction-double-comptage-fp-ris.md.
    const regimesHorsSaisieManuelle = regimesValides.filter(r => !estRegimeSaisieManuelle(r.nom));

    // trimestresValides = somme de tous les régimes de type "trimestres"
    // détectés dans le RIS (Assurance retraite, MSA Salariés, ou tout autre
    // régime aligné présenté séparément) — depuis la réforme LURA (2017), les
    // trimestres des régimes alignés se fusionnent dans un seul calcul, donc
    // on ne privilégie plus un unique régime "Assurance retraite" au risque
    // d'ignorer silencieusement les trimestres d'un régime aligné distinct.
    const regimesTrimestres = regimesHorsSaisieManuelle.filter(r => r.type === 'trimestres' && r.trimestres !== undefined);
    if (regimesTrimestres.length > 0) {
      const totalTrimestres = regimesTrimestres.reduce((total, r) => total + (r.trimestres || 0), 0);
      setTrimestresValides(totalTrimestres.toString());
    }

    // Les régimes complémentaires par points sont conservés à part : pas de
    // calcul de pension complémentaire à ce stade. Un nouvel import remplace
    // entièrement la liste précédente (pas de fusion, pour éviter les doublons
    // si un régime a changé de valeur d'une année sur l'autre) ; la
    // persistance effective se fait via handleSave, comme les autres champs.
    setRegimesPoints(regimesHorsSaisieManuelle.filter(r => r.type === 'points'));

    // Détail de carrière et SAM proposé : même logique de remplacement
    // intégral qu'au-dessus, la persistance se fait via handleSave.
    setDetailCarriere(detailCarriereValide);
    if (samPropose !== null && !Number.isNaN(samPropose)) {
      setSalaireAnnuelMoyen(samPropose.toString());
    }

    setRisDialogOpen(false);
  };

  const handleRemoveRegimePoint = (index: number) => {
    setRegimesPoints(regimesPoints.filter((_, i) => i !== index));
  };

  const handleRemovePeriode = (index: number) => {
    setDetailCarriere(detailCarriere.filter((_, i) => i !== index));
  };

  const handleEditPeriode = (index: number) => {
    setIndexPeriodeEditee(index);
  };

  const handleSaveEditedPeriode = (periodeModifiee: PeriodeCarriere) => {
    if (indexPeriodeEditee === null) return;
    setDetailCarriere(detailCarriere.map((p, i) => (i === indexPeriodeEditee ? periodeModifiee : p)));
    setIndexPeriodeEditee(null);
  };

  const formatEuro2 = (valeur: number) =>
    valeur.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const regimesPointsExclusCount = regimesPoints.filter(
    (regime) => pensionComplementaireAnnuelle(regime) === undefined
  ).length;

  // Hypothèse de revenu futur — hook appelé une seule fois ici (plutôt que
  // dans ToggleHypotheseRevenuFutur, cf. commentaire au-dessus de ce
  // composant) : consomme le `data`/`detailCarriere`/`saveRetraiteData` déjà
  // chargés par Carriere.tsx au lieu de refaire sa propre requête.
  const hypotheseRevenuFutur = useHypotheseRevenuFutur(
    data,
    detailCarriere,
    loading || loadingCarriereDetail,
    saveRetraiteData
  );

  // Projection de revenu futur (cf. docs/audit/audit-pension-consolidation.md,
  // étape 2 de la fusion) : complète les années manquantes entre aujourd'hui
  // et l'âge légal réel par un revenu hypothétique, pour estimer les
  // trimestres/pension futurs — même fonction que Synthèse
  // (usePensionConsolidee.ts), appliquée ici à la saisie live de l'écran
  // (`hypotheseRevenuFutur.valeurManuelle`, pas encore forcément sauvegardée)
  // plutôt qu'à la dernière valeur persistée, cohérent avec le choix déjà
  // fait pour salaireAnnuelMoyen/trimestresValides ci-dessous (Carrière
  // reflète la saisie en cours, pas seulement le dernier enregistrement).
  const projectionRevenuFutur = useMemo(
    () =>
      calculerProjectionRevenuFutur(
        dateNaissanceDetail,
        detailCarriere,
        parseFloat(salaireAnnuelMoyen) || 0,
        hypotheseRevenuFutur.mode,
        parseFloat(hypotheseRevenuFutur.valeurManuelle) || null,
        new Date()
      ),
    [
      dateNaissanceDetail,
      detailCarriere,
      salaireAnnuelMoyen,
      hypotheseRevenuFutur.mode,
      hypotheseRevenuFutur.valeurManuelle,
    ]
  );

  // Source unique de calcul (cf. docs/audit/audit-pension-consolidation.md) :
  // même fonction que Synthese.tsx (via usePensionConsolidee.ts), appelée ici
  // directement sur le state live de cet écran plutôt que sur les données
  // rechargées depuis Supabase — Carrière doit refléter la saisie en cours,
  // pas seulement la dernière version sauvegardée. Salaire/trimestres déjà
  // augmentés de la projection de revenu futur ci-dessus (étape 2 de la
  // fusion).
  const entreePensionConsolidee = useMemo<EntreePensionConsolidee>(
    () => ({
      salaireAnnuelMoyen: projectionRevenuFutur.salaireAnnuelMoyenProjete,
      trimestresValides: (parseInt(trimestresValides) || 0) + projectionRevenuFutur.trimestresValidesProjetes,
      trimestresRequis,
      dateNaissance: dateNaissanceDetail,
      ageActuel,
      regimesPoints,
      detailCarriere,
      familyLinks,
      auMoinsUnTrimestreMajorationEnfant,
      autresPensionsMensuelles: parseFloat(autresPensionsMensuelles) || 0,
      fonctionPublique: hasFonctionPublique
        ? {
            traitementIndiciaireBrut: parseFloat(traitementIndiciaireBrut) || 0,
            trimestresLiquidables: parseInt(trimestresLiquidablesFP) || 0,
            pointsRAFP: parseFloat(pointsRAFP) || 0,
            departAnticipeCategorieActive,
            ageDepartAnticipe: parseFloat(ageDepartAnticipe),
            ageAnnulationDecote: parseFloat(ageAnnulationDecote),
            departPourInvalidite,
            anneeOuvertureDroits: anneeOuvertureDroits === '' ? undefined : parseInt(anneeOuvertureDroits, 10),
          }
        : null,
      cnavpl: hasCNAVPL
        ? {
            trimestresCNAVPL: parseInt(trimestresCNAVPL) || 0,
            pointsCNAVPL: parseFloat(pointsCNAVPL) || 0,
            valeurPointCNAVPL: parseFloat(valeurPointCNAVPL) || 0,
          }
        : null,
    }),
    [
      projectionRevenuFutur,
      trimestresValides,
      trimestresRequis,
      dateNaissanceDetail,
      ageActuel,
      regimesPoints,
      detailCarriere,
      familyLinks,
      auMoinsUnTrimestreMajorationEnfant,
      autresPensionsMensuelles,
      hasFonctionPublique,
      traitementIndiciaireBrut,
      trimestresLiquidablesFP,
      pointsRAFP,
      departAnticipeCategorieActive,
      ageDepartAnticipe,
      ageAnnulationDecote,
      departPourInvalidite,
      anneeOuvertureDroits,
      hasCNAVPL,
      trimestresCNAVPL,
      pointsCNAVPL,
      valeurPointCNAVPL,
    ]
  );

  const resultatPension = useMemo(
    () => calculerPensionConsolidee(entreePensionConsolidee),
    [entreePensionConsolidee]
  );

  const { detailRegimeGeneral, repartitionParRegime, historiqueTrimestres } = resultatPension;

  // Minimum contributif (MiCo, régime général, version non majorée) : le
  // state brut (non projeté à cette étape) sert aussi à l'indicateur de
  // cohérence RIS ↔ carrière saisie ci-dessous.
  const trimValidesRegimeGeneral = parseInt(trimestresValides) || 0;

  // Détail de carrière ↔ RIS : source dérivée, PAS une source concurrente de
  // trimestres_valides (le RIS reste la source de vérité pour le nombre TOTAL
  // de trimestres, cf. en-tête de fichier et docs/audit/audit-retraite.md) —
  // `.total` sert uniquement de contrôle de cohérence à l'écran (jamais
  // injecté dans trimestresValides).
  const totalDeriveCarriere = historiqueTrimestres.total;
  const ecartCoherenceTrimestres = trimValidesRegimeGeneral - totalDeriveCarriere;
  const trimestresCotisesRegimeGeneral = historiqueTrimestres.cotises;

  const pensionBaseBrute = detailRegimeGeneral.pensionBaseBrute;
  const decoteSurcote = detailRegimeGeneral.decote;
  const surcoteClassiquePct = detailRegimeGeneral.surcoteClassiquePct;
  const surcoteParentalePct = detailRegimeGeneral.surcoteParentalePct;
  const surcoteTotalePct = detailRegimeGeneral.surcoteTotalePct;
  const surcoteMontantRegimeGeneral = detailRegimeGeneral.surcoteMontant;
  const micoMontant = detailRegimeGeneral.micoMontant;
  const majorationPalier1 = detailRegimeGeneral.majorationPalier1;
  const majorationPalier2 = detailRegimeGeneral.majorationPalier2;
  const majorationMicoTotaleAvantEcretement = detailRegimeGeneral.majorationMicoAvantEcretement;
  const majorationMicoTotaleApresEcretement = detailRegimeGeneral.majorationMicoApresEcretement;
  const ecretementApplique = majorationMicoTotaleApresEcretement < majorationMicoTotaleAvantEcretement;
  const majorationEnfantsPct = detailRegimeGeneral.majorationEnfantsPct;
  const nombreEnfantsEligibles = detailRegimeGeneral.nombreEnfantsEligibles;

  const pensionBaseAjustee = repartitionParRegime.baseRegimeGeneral;
  const totalPensionComplementaireAnnuelle = repartitionParRegime.complementaireRegimeGeneral;
  const pensionTotaleRegimeGeneral = pensionBaseAjustee + totalPensionComplementaireAnnuelle;
  const pensionTotaleFonctionPublique = hasFonctionPublique
    ? repartitionParRegime.fonctionPublique + repartitionParRegime.rafp
    : 0;
  const pensionTotaleCNAVPL = hasCNAVPL ? repartitionParRegime.cnavpl : 0;
  const pensionTotaleConsolidee = resultatPension.pensionTotaleConsolidee;
  const ageTauxPlein = resultatPension.ageTauxPlein;
  const aDesRegimesSupplementaires = hasFonctionPublique || hasCNAVPL;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SaveStatusIndicator status={saveStatus} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 p-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Informations de carrière</CardTitle>
            <CardDescription className="text-xs">
              Renseignez les éléments de votre carrière pour calculer votre pension
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleImportClick}
            disabled={risImporting}
          >
            <Upload className="h-4 w-4" />
            {risImporting ? 'Lecture en cours...' : 'Importer mon relevé de carrière (RIS)'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelected}
          />
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="salaire-moyen" className="text-xs">Salaire annuel moyen (€)</Label>
              <Input
                id="salaire-moyen"
                type="number"
                placeholder="Ex: 45000"
                value={salaireAnnuelMoyen}
                onChange={(e) => setSalaireAnnuelMoyen(e.target.value)}
                onBlur={saveNow}
               className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Gestion des trimestres</CardTitle>
          <CardDescription className="text-xs">
            Suivez vos trimestres validés et calculez l'âge du taux plein
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trimestres-valides" className="text-xs">Trimestres validés</Label>
              <Input
                id="trimestres-valides"
                type="number"
                placeholder="Ex: 160"
                value={trimestresValides}
                onChange={(e) => setTrimestresValides(e.target.value)}
                onBlur={saveNow}
               className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trimestres-requis" className="text-xs">Trimestres requis</Label>
              <Input
                id="trimestres-requis"
                type="number"
                value={trimestresRequis}
                disabled
                className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Valeur fixée selon votre date de naissance
              </p>
            </div>
          </div>

          <ToggleHypotheseRevenuFutur personne={personne} hypothese={hypotheseRevenuFutur} />

          <div className="flex items-start space-x-2">
            <Checkbox
              id="majoration-enfant"
              checked={auMoinsUnTrimestreMajorationEnfant}
              onCheckedChange={(checked) => setAuMoinsUnTrimestreMajorationEnfant(checked === true)}
            />
            <div className="space-y-1">
              <label htmlFor="majoration-enfant" className="text-xs font-medium leading-none">
                Au moins 1 trimestre de majoration pour enfant
              </label>
              <p className="text-xs text-muted-foreground">
                Maternité, adoption, éducation, enfant handicapé ou congé parental — quel que soit
                le régime de base qui l'a accordé. Condition d'éligibilité à la surcote parentale
                (référentiel §2.3.2), déclarative : ne cochez que si ce trimestre figure déjà sur le
                relevé de carrière du client.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs">Âge du taux plein</Label>
              <div className="text-sm font-semibold text-primary mt-1">
                {ageTauxPlein}
              </div>
            </div>

            {trimestresValides && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-xl font-bold text-primary">
                    {trimestresValides}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trimestres validés
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg">
                  <div className="text-xl font-bold">
                    {trimestresRequis}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trimestres requis
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg">
                  <div className={`text-xl font-bold ${
                    parseInt(trimestresValides) >= trimestresRequis
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}>
                    {Math.max(0, trimestresRequis - parseInt(trimestresValides))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trimestres manquants
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Calculs de pension</CardTitle>
          <CardDescription className="text-xs">
            Estimation de votre pension de retraite de base
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Pension de base brute</Label>
              <div className="text-xl font-semibold text-primary">
                {pensionBaseBrute.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                SAM × 50% × (Trimestres validés / Trimestres requis)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Décote / Surcote</Label>
              <div className={`text-xl font-semibold ${
                decoteSurcote + surcoteTotalePct < 0 ? 'text-destructive' :
                decoteSurcote + surcoteTotalePct > 0 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {decoteSurcote + surcoteTotalePct > 0 ? '+' : ''}{(decoteSurcote + surcoteTotalePct).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {decoteSurcote < 0
                  ? `Décote de ${Math.abs(decoteSurcote).toFixed(2)}% (-1,25% par trimestre manquant)`
                  : surcoteTotalePct > 0
                  ? `Surcote de ${surcoteTotalePct.toFixed(2)}% (classique ${surcoteClassiquePct.toFixed(2)}% + parentale ${surcoteParentalePct.toFixed(2)}%, plafonnée à 5%)`
                  : 'Aucune décote ni surcote'
                }
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="autres-pensions-mensuelles" className="text-xs">
              Autres pensions perçues, mensuel (optionnel)
            </Label>
            <Input
              id="autres-pensions-mensuelles"
              type="number"
              placeholder="Ex: 600"
              value={autresPensionsMensuelles}
              onChange={(e) => setAutresPensionsMensuelles(e.target.value)}
              className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Pensions personnelles brutes d'autres régimes non modélisés par cet outil (étranger,
              complémentaires non saisies...) — sert uniquement à l'écrêtement du MICO (référentiel
              §3.5.5). Non renseigné = 0, aucun effet sur le calcul.
            </p>
          </div>

          {pensionBaseBrute > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs">Pension ajustée (avec décote/surcote/MICO/majoration enfants)</Label>
              <div className="text-lg font-semibold text-primary">
                {pensionBaseAjustee.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum contributif (MICO) : {formatEuro2(micoMontant)} / an
                {surcoteTotalePct > 0 && <> · Surcote : {formatEuro2(surcoteMontantRegimeGeneral)} / an</>}
              </p>
              {majorationPalier2 > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  dont palier 1 (base) : {formatEuro2(majorationPalier1)} / an · palier 2 (majoré,{' '}
                  {trimestresCotisesRegimeGeneral} trimestres cotisés) : {formatEuro2(majorationPalier2)} / an
                </p>
              )}
              {ecretementApplique && (
                <p className="text-xs text-orange-600 mt-1">
                  Écrêtement appliqué : majoration MICO réduite de{' '}
                  {formatEuro2(majorationMicoTotaleAvantEcretement - majorationMicoTotaleApresEcretement)} / an
                  (plafond global de pensions dépassé, référentiel §3.5.5).
                </p>
              )}
              {majorationEnfantsPct > 0 && (
                <p className="text-xs text-muted-foreground">
                  Majoration pour {nombreEnfantsEligibles} enfants : +{majorationEnfantsPct}%
                </p>
              )}
            </div>
          )}

          {(pensionBaseBrute > 0 || regimesPoints.length > 0 || aDesRegimesSupplementaires) && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs">
                Total consolidé{aDesRegimesSupplementaires ? ' tous régimes' : ''} (pension de base
                ajustée + pensions complémentaires
                {hasFonctionPublique ? ' + fonction publique + RAFP' : ''}
                {hasCNAVPL ? ' + CNAVPL' : ''})
              </Label>
              <div className="text-lg font-semibold text-primary">
                {formatEuro2(pensionTotaleConsolidee)} / an
              </div>
              <p className="text-xs text-muted-foreground">
                Pension de base ajustée : {formatEuro2(pensionBaseAjustee)} + pensions complémentaires calculables : {formatEuro2(totalPensionComplementaireAnnuelle)}
              </p>
              {regimesPointsExclusCount > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {regimesPointsExclusCount} régime{regimesPointsExclusCount > 1 ? 's' : ''} non inclus, valeur du point manquante
                </p>
              )}
              {aDesRegimesSupplementaires && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Détail par régime : régime général (base + complémentaires) ={' '}
                  {formatEuro2(pensionTotaleRegimeGeneral)} / an
                  {hasFonctionPublique && (
                    <> — fonction publique (pension + RAFP) = {formatEuro2(pensionTotaleFonctionPublique)} / an</>
                  )}
                  {hasCNAVPL && <> — CNAVPL = {formatEuro2(pensionTotaleCNAVPL)} / an</>}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Régimes de retraite complémentaire (points)</CardTitle>
          <CardDescription className="text-xs">
            Régimes par points détectés lors de l'import de votre relevé de carrière (RIS)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {regimesPoints.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun régime à points enregistré. Importez votre relevé de carrière pour les détecter automatiquement.
            </p>
          ) : (
            <div className="space-y-2">
              {regimesPoints.map((regime, index) => {
                const pensionAnnuelle = pensionComplementaireAnnuelle(regime);
                return (
                  <div
                    key={`${regime.nom}-${index}`}
                    className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">{regime.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {regime.points?.toLocaleString('fr-FR')} points
                        {regime.valeurPoint !== undefined && (
                          <>
                            {' · '}
                            Valeur du point : {regime.valeurPoint.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </>
                        )}
                        {regime.dateValeurPoint && (
                          <>
                            {' '}
                            (au {regime.dateValeurPoint})
                          </>
                        )}
                      </div>
                      {pensionAnnuelle !== undefined ? (
                        <div className="text-xs font-medium text-primary">
                          Pension complémentaire : {formatEuro2(pensionAnnuelle)} / an ({formatEuro2(pensionAnnuelle / 12)} / mois)
                        </div>
                      ) : (
                        <div className="text-xs text-orange-600">
                          Valeur du point manquante, montant non calculable
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRegimePoint(index)}
                      aria-label={`Supprimer le régime ${regime.nom}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Détail de carrière</CardTitle>
          <CardDescription className="text-xs">
            Employeur / activité détectés lors de l'import de votre relevé de carrière (RIS)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          {trimestresValides && detailCarriere.length > 0 && (
            Math.abs(ecartCoherenceTrimestres) <= SEUIL_ECART_COHERENCE_TRIMESTRES ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Cohérent avec la carrière saisie ({totalDeriveCarriere} trimestres dérivés de la carrière, contre{' '}
                {trimValidesRegimeGeneral} trimestres validés au RIS)
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-orange-600 p-2.5 border border-orange-500/20 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Écart détecté entre le RIS importé ({trimValidesRegimeGeneral} trimestres) et la carrière saisie
                  ({totalDeriveCarriere} trimestres) — vérifier que la carrière est complète. Le RIS reste la
                  référence retenue pour le calcul de pension ci-dessus ; cet écart n'est pas corrigé
                  automatiquement.
                </span>
              </div>
            )
          )}
          {detailCarriere.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucune période enregistrée. Importez votre relevé de carrière pour les détecter automatiquement.
            </p>
          ) : (
            <Collapsible open={detailCarriereOuvert} onOpenChange={setDetailCarriereOuvert}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${detailCarriereOuvert ? 'rotate-180' : ''}`} />
                  {detailCarriereOuvert ? 'Masquer' : 'Afficher'} le détail ({detailCarriere.length} période
                  {detailCarriere.length > 1 ? 's' : ''})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-3">
                {detailCarriere.map((periode, index) => (
                  <div
                    key={`${periode.employeur}-${periode.dateDebut}-${index}`}
                    className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">{periode.employeur}</div>
                      <div className="text-xs text-muted-foreground">
                        {LIBELLE_TYPE_ACTIVITE[periode.typeActivite]} · {formatDateFr(periode.dateDebut)} →{' '}
                        {formatDateFr(periode.dateFin)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {periode.revenu !== null
                          ? `${formatEuro2(periode.revenu)}${periode.estChiffreAffaires ? ' (chiffre d\'affaires)' : ''}`
                          : 'Revenu non renseigné'}
                        {periode.regimes.length > 0 && <> · {periode.regimes.join(', ')}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPeriode(index)}
                        aria-label={`Modifier la période ${periode.employeur}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePeriode(index)}
                        aria-label={`Supprimer la période ${periode.employeur}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <CarriereFonctionPublique
        trimestresRequis={trimestresRequis}
        trimestresAutresRegimes={(parseInt(trimestresValides) || 0) + (hasCNAVPL ? parseInt(trimestresCNAVPL) || 0 : 0)}
        hasFonctionPublique={hasFonctionPublique}
        onHasFonctionPubliqueChange={setHasFonctionPublique}
        trimestresLiquidables={trimestresLiquidablesFP}
        onTrimestresLiquidablesChange={setTrimestresLiquidablesFP}
        traitementIndiciaireBrut={traitementIndiciaireBrut}
        onTraitementIndiciaireBrutChange={setTraitementIndiciaireBrut}
        pointsRAFP={pointsRAFP}
        onPointsRAFPChange={setPointsRAFP}
        departAnticipeCategorieActive={departAnticipeCategorieActive}
        onDepartAnticipeCategorieActiveChange={setDepartAnticipeCategorieActive}
        ageDepartAnticipe={ageDepartAnticipe}
        onAgeDepartAnticipeChange={setAgeDepartAnticipe}
        ageAnnulationDecote={ageAnnulationDecote}
        onAgeAnnulationDecoteChange={setAgeAnnulationDecote}
        departPourInvalidite={departPourInvalidite}
        onDepartPourInvaliditeChange={setDepartPourInvalidite}
        anneeOuvertureDroits={anneeOuvertureDroits}
        onAnneeOuvertureDroitsChange={setAnneeOuvertureDroits}
        dateNaissance={dateNaissanceDetail}
        auMoinsUnTrimestreMajorationEnfant={auMoinsUnTrimestreMajorationEnfant}
        nombreEnfantsEligibles={nombreEnfantsEligibles}
      />

      <CarriereCNAVPL
        trimestresRequis={trimestresRequis}
        trimestresAutresRegimes={(parseInt(trimestresValides) || 0) + (hasFonctionPublique ? parseInt(trimestresLiquidablesFP) || 0 : 0)}
        hasCNAVPL={hasCNAVPL}
        onHasCNAVPLChange={setHasCNAVPL}
        trimestresCNAVPL={trimestresCNAVPL}
        onTrimestresCNAVPLChange={setTrimestresCNAVPL}
        pointsCNAVPL={pointsCNAVPL}
        onPointsCNAVPLChange={setPointsCNAVPL}
        valeurPointCNAVPL={valeurPointCNAVPL}
        onValeurPointCNAVPLChange={setValeurPointCNAVPL}
        dateNaissance={dateNaissanceDetail}
        auMoinsUnTrimestreMajorationEnfant={auMoinsUnTrimestreMajorationEnfant}
        nombreEnfantsEligibles={nombreEnfantsEligibles}
      />

      <RISImportDialog
        open={risDialogOpen}
        regimes={regimesDetectes}
        detailCarriere={periodesDetectees}
        anneeNaissance={anneeNaissance}
        onValidate={handleValidateRIS}
        onCancel={() => setRisDialogOpen(false)}
      />

      <PeriodeCarriereEditDialog
        open={indexPeriodeEditee !== null}
        periode={indexPeriodeEditee !== null ? detailCarriere[indexPeriodeEditee] : null}
        onSave={handleSaveEditedPeriode}
        onCancel={() => setIndexPeriodeEditee(null)}
      />
    </div>
  );
};