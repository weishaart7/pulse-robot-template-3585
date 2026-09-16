import { AlerteContext, AlerteDefinition } from './types';
import { isDetenteurCommon } from '@/lib/patrimoine/utils';
import { CLAUSES_IMPACTING_TRANSMISSION } from '@/constants/matrimonialClauses';

const normalize = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isPacse = (statut?: string) => normalize(statut).includes('pacs');
const isConcubinage = (statut?: string) => normalize(statut).includes('concubin');
const isMarie = (statut?: string) => normalize(statut).includes('mari');
const isCommunauteUniverselle = (regime?: string) => normalize(regime).includes('universelle');

// Communauté légale (réduite aux acquêts), communauté de meubles et acquêts,
// ou communauté universelle — les 3 régimes communautaires du référentiel
// (cf. src/components/famille/RelationInfoForm.tsx pour les libellés exacts).
const isRegimeCommunautaire = (regime?: string) => normalize(regime).includes('communaute');

// Abattement en ligne directe (art. 779 CGI), par parent et par enfant.
const ABATTEMENT_LIGNE_DIRECTE = 100000;

// Simplification assumée (cf. Vague 0, alertes #1/#2) : un testament existe
// dès qu'une ligne de legs porte testament_realise = 'Oui', sans tenter de
// vérifier que le bénéficiaire nommé est précisément le partenaire/concubin
// (beneficiaire_nom est un texte libre, appariement fragile). C'est un
// rappel de vigilance, pas un calcul exact — faux négatif possible si un
// testament existe mais exclut le partenaire.
const hasTestamentRealise = (liberalites: AlerteContext['liberalites']) =>
  liberalites.some((l) => l.type === 'legs' && l.testament_realise === 'Oui');

// Ne prend pas en compte typeDetention/nuProprietaireId : un concubin désigné
// uniquement en nue-propriété (sans usufruit) neutralise quand même l'alerte
// aujourd'hui — cas volontairement non traité, à trancher plus tard.
const hasAVBeneficiaireDesigne = (avContracts: AlerteContext['avContracts']) =>
  avContracts.some((c) =>
    c.clauseBeneficiaireStructuree?.niveaux?.some((n) =>
      n.beneficiaires?.some(
        (b) => b.familyLinkId === 'conjoint' && b.statut !== 'renoncant' && b.statut !== 'decede' && b.pourcentage > 0
      )
    )
  );

// Clauses d'avantage matrimonial susceptibles de fonder une action en
// retranchement (art. 1527 al. 2 C. civ.) en présence d'enfants non communs :
// sous-ensemble de CLAUSES_IMPACTING_TRANSMISSION (constants/matrimonialClauses.ts),
// qui inclut aussi 'societe_acquets' (l'adjonction elle-même est neutre, ce
// sont ses clauses "_sub" — préciput_sub, attribution_integrale_sub,
// partage_inegal_sub — qui portent l'avantage) et 'partage_inegal_acquets'
// (participation aux acquêts, exclue par prudence : la doctrine évoque un
// avantage matrimonial possible mais « sous réserve de l'appréciation
// souveraine des tribunaux », sans retranchement clairement établi).
const CLAUSES_RETRANCHEMENT = CLAUSES_IMPACTING_TRANSMISSION.filter(
  (key) => key !== 'societe_acquets' && key !== 'partage_inegal_acquets'
);

const hasAvantageMatrimonialActif = (clausesContrat?: AlerteContext['clausesContrat']) =>
  CLAUSES_RETRANCHEMENT.some((key) => !!clausesContrat?.[key]?.enabled);

// Clauses révoquées de plein droit par le divorce, sauf volonté contraire
// (art. 265 C. civ., formalisme durci par la loi n°2024-494 du 31 mai 2024) :
// préciput, attribution intégrale, partage inégal (+ variantes société
// d'acquêts), et pour la participation aux acquêts la clause de partage
// inégal des acquêts. Périmètre volontairement plus large que
// CLAUSES_RETRANCHEMENT (question juridique différente) : inclut
// 'partage_inegal_acquets', explicitement cité par la doctrine parmi les
// avantages qui disparaissent au divorce, contrairement au retranchement où
// son inclusion n'est pas clairement établie.
//
// Hors périmètre (à trancher séparément) : 'modification_recompenses' (le
// libellé du catalogue couvre plus large que la seule dispense de
// récompense visée par la doctrine comme révoquée), 'prelevement_biens_communs'
// / 'prelevement_indemnisation' / 'plafonnement_creance' /
// 'attribution_preferentielle' (non cités explicitement parmi les clauses
// révoquées), 'reprise_apports' / 'dissolution_alternative' (mécanismes dont
// l'objet est justement de régler le sort du divorce, pas des avantages
// eux-mêmes révocables par lui).
const CLAUSES_REVOCATION_DIVORCE = [
  'preciput',
  'preciput_sub',
  'attribution_integrale',
  'attribution_integrale_sub',
  'partage_inegal',
  'partage_inegal_sub',
  'partage_inegal_acquets',
] as const;

const hasAvantageMatrimonialSansMaintienDivorce = (clausesContrat?: AlerteContext['clausesContrat']) =>
  CLAUSES_REVOCATION_DIVORCE.some((key) => {
    const clause = clausesContrat?.[key];
    return !!clause?.enabled && clause?.options?.maintienDivorce !== true;
  });

export const REGLES_ALERTES_CONSEIL: AlerteDefinition[] = [
  {
    id: 'pacse_sans_testament',
    niveau: 'critique',
    condition: (ctx) => isPacse(ctx.statutCouple) && !hasTestamentRealise(ctx.liberalites),
    message:
      "Votre partenaire n'héritera de rien. L'exonération de droits de succession dont il bénéficie ne s'appliquera à aucun actif.",
  },
  {
    id: 'concubin_sans_protection',
    niveau: 'critique',
    condition: (ctx) =>
      isConcubinage(ctx.statutCouple) &&
      !hasTestamentRealise(ctx.liberalites) &&
      !hasAVBeneficiaireDesigne(ctx.avContracts),
    message: 'Aucune vocation successorale. Fiscalité de 60 % en cas de legs.',
  },
  {
    id: 'mariage_avant_1966_sans_contrat',
    niveau: 'moyen',
    condition: (ctx) => {
      if (!isMarie(ctx.statutCouple) || !ctx.pasDeContratMariage || !ctx.dateMariage) return false;
      const d = new Date(ctx.dateMariage);
      return !isNaN(d.getTime()) && d < new Date('1966-02-01');
    },
    message:
      'Régime légal applicable : communauté de meubles et acquêts. Les biens meubles détenus avant le mariage sont communs.',
  },
  {
    id: 'pacs_avant_2007_sans_convention',
    niveau: 'moyen',
    condition: (ctx) => {
      if (!isPacse(ctx.statutCouple) || ctx.conventionPacs || !ctx.datePacs) return false;
      const d = new Date(ctx.datePacs);
      return !isNaN(d.getTime()) && d < new Date('2007-01-01');
    },
    message: "Régime d'indivision présumée applicable.",
  },
  {
    id: 'communaute_universelle_double_abattement',
    niveau: 'moyen',
    condition: (ctx) => {
      if (!isCommunauteUniverselle(ctx.regimeMatrimonial) || ctx.patrimoineNet == null) return false;
      const nombreEnfants = ctx.familyLinks.filter((f) => f.lien_familial === 'Enfant' && !f.est_decede).length;
      if (nombreEnfants === 0) return false;
      return ctx.patrimoineNet > 2 * ABATTEMENT_LIGNE_DIRECTE * nombreEnfants;
    },
    message: "Comparer le coût fiscal global sur les deux décès avec l'option usufruit au premier décès.",
  },
  {
    id: 'separation_biens_rp_indivise_remboursement_unilateral',
    niveau: 'eleve',
    condition: (ctx) => {
      if (ctx.regimeMatrimonial !== 'Séparation de biens') return false;
      return ctx.assets.some((a) => {
        if (a.nature !== 'Résidence principale' || !isDetenteurCommon(a.detenteur)) return false;
        const emprunt = ctx.emprunts.find((e) => e.asset_id === a.id);
        return emprunt?.contributeur_remboursement === 'utilisateur' || emprunt?.contributeur_remboursement === 'conjoint';
      });
    },
    message:
      'Le remboursement peut être requalifié en contribution aux charges du mariage et ne générer aucune créance. Vérifier la clause du contrat.',
  },
  {
    id: 'parts_non_negociables_souscrites_pendant_mariage',
    niveau: 'moyen',
    condition: (ctx) => {
      if (!isRegimeCommunautaire(ctx.regimeMatrimonial) || !ctx.dateMariage) return false;
      const dateMariage = new Date(ctx.dateMariage);
      if (isNaN(dateMariage.getTime())) return false;
      return ctx.societes.some((s) => {
        if (s.parts_negociables !== false || !s.date_souscription) return false;
        const dateSouscription = new Date(s.date_souscription);
        return !isNaN(dateSouscription.getTime()) && dateSouscription > dateMariage;
      });
    },
    message: "Le conjoint peut revendiquer la qualité d'associé pour la moitié des parts (art. 1832-2). Vérifier l'existence d'une renonciation.",
  },
  {
    id: 'participation_acquets_sans_etat_descriptif_signe',
    niveau: 'eleve',
    condition: (ctx) =>
      ctx.regimeMatrimonial === 'Participation aux acquêts' &&
      !ctx.patrimoineOriginaire.some((p) => p.signe === true),
    message: 'Le régime sera très difficile à liquider. Établir un état descriptif signé (art. 1570).',
  },
  {
    id: 'exclusion_biens_professionnels_sans_maintien_divorce',
    niveau: 'eleve',
    condition: (ctx) => {
      const clause = ctx.clausesContrat?.exclusion_biens_professionnels;
      return !!clause?.enabled && clause?.options?.maintienDivorce !== true;
    },
    message: 'Clause révoquée de plein droit au divorce (Cass. 1re civ., 18 déc. 2019). Ajouter une stipulation expresse.',
  },
  {
    id: 'avantage_matrimonial_sans_maintien_divorce',
    niveau: 'eleve',
    condition: (ctx) => hasAvantageMatrimonialSansMaintienDivorce(ctx.clausesContrat),
    message:
      'Cette clause sera révoquée de plein droit en cas de divorce (art. 265). Une volonté contraire doit être exprimée dans la convention matrimoniale ou lors du divorce.',
  },
  {
    id: 'extraneite_residence_fiscale_etranger',
    niveau: 'moyen',
    condition: (ctx) => !!ctx.clientResidenceFiscaleEtranger || !!ctx.conjointResidenceFiscaleEtranger,
    message: 'La loi applicable au régime matrimonial doit être vérifiée (§ 4.4).',
  },
  {
    id: 'enfants_non_communs_sans_ddv',
    niveau: 'eleve',
    condition: (ctx) => ctx.hasNonCommonChildren && !ctx.hasDDV,
    message:
      "Le conjoint ne pourra prétendre qu'à 1/4 en pleine propriété (art. 757). Une donation au dernier vivant lui ouvrirait l'option de l'usufruit total.",
  },
  {
    id: 'ddv_enfant_non_commun_substitution_1098',
    niveau: 'moyen',
    condition: (ctx) => ctx.hasNonCommonChildren && ctx.hasDDV,
    message:
      "Donation au dernier vivant en présence d'enfant(s) non commun(s) : si l'acte ne laisse pas le choix entre les 3 quotités de l'art. 1094-1, l'enfant non commun dispose d'une faculté de substitution en usufruit sur l'excédent (art. 1098). À vérifier dans la rédaction de l'acte — non déductible depuis les données de cet outil.",
  },
  {
    id: 'enfants_non_communs_avantage_matrimonial',
    niveau: 'critique',
    // Le retranchement (art. 1527 al. 2) concerne tout avantage matrimonial
    // (préciput, attribution intégrale, partage inégal — y compris leurs
    // variantes de société d'acquêts), dans tout régime communautaire, pas
    // seulement l'attribution intégrale en communauté universelle. Le régime
    // n'a pas besoin d'être vérifié explicitement : chaque clause de
    // CLAUSES_RETRANCHEMENT n'est de toute façon proposée à la saisie que
    // dans un régime où elle est juridiquement admise (cf.
    // CLAUSE_REGIME_COMPATIBILITY, constants/matrimonialClauses.ts).
    condition: (ctx) => ctx.hasNonCommonChildren && hasAvantageMatrimonialActif(ctx.clausesContrat),
    message:
      "Risque d'action en retranchement (art. 1527 al. 2). Envisager une renonciation anticipée (art. 1527 al. 3).",
  },
];
