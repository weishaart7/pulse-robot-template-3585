import { AlerteContext, AlerteDefinition } from './types';
import { isDetenteurCommon } from '@/lib/patrimoine/utils';

const normalize = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isPacse = (statut?: string) => normalize(statut).includes('pacs');
const isConcubinage = (statut?: string) => normalize(statut).includes('concubin');
const isMarie = (statut?: string) => normalize(statut).includes('mari');
const isCommunauteUniverselle = (regime?: string) => normalize(regime).includes('universelle');

// Communauté légale (réduite aux acquêts), communauté de meubles et acquêts,
// ou communauté universelle — les 3 régimes communautaires du référentiel
// (cf. src/components/famille/RelationInfoForm.tsx pour les libellés exacts).
const isRegimeCommunautaire = (regime?: string) => normalize(regime).includes('communaute');

const isSocieteAcquets = (regime?: string) => {
  const r = normalize(regime);
  return r.includes('separation') && r.includes('societe') && r.includes('acquets');
};

const isDirigeant = (ctx: Pick<AlerteContext, 'clientEstDirigeant' | 'conjointEstDirigeant'>) =>
  !!ctx.clientEstDirigeant || !!ctx.conjointEstDirigeant;

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

const hasAVBeneficiaireDesigne = (avContracts: AlerteContext['avContracts']) =>
  avContracts.some((c) =>
    c.clauseBeneficiaireStructuree?.niveaux?.some((n) =>
      n.beneficiaires?.some((b) => !!b.nom?.trim())
    )
  );

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
    id: 'dirigeant_regime_communautaire',
    niveau: 'eleve',
    condition: (ctx) => isRegimeCommunautaire(ctx.regimeMatrimonial) && isDirigeant(ctx),
    message: 'Les dettes professionnelles engagent la masse commune (art. 1413). Vérifier les cautionnements (art. 1415).',
  },
  {
    id: 'dirigeant_societe_acquets_residence_principale',
    niveau: 'moyen',
    condition: (ctx) =>
      isSocieteAcquets(ctx.regimeMatrimonial) &&
      !!ctx.clausesContrat?.societe_acquets?.enabled &&
      !!ctx.clausesContrat?.societe_acquets?.options?.residencePrincipale &&
      isDirigeant(ctx),
    message: 'Le logement devient le gage des créanciers professionnels (art. 1413). Arbitrage à documenter.',
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
    id: 'extraneite_residence_fiscale_etranger',
    niveau: 'moyen',
    condition: (ctx) => !!ctx.clientResidenceFiscaleEtranger || !!ctx.conjointResidenceFiscaleEtranger,
    message: 'La loi applicable au régime matrimonial doit être vérifiée (§ 4.4).',
  },
];
