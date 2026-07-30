import { z } from 'zod';
import { FamilyLink, MaritalStatus, FamilyProfile } from '@/services/familyService';
import { Asset } from '@/services/assetService';
import { FamilyGraph, Person, PatrimonySnapshot, Liberalite, PersonId, TransmissionResult, RawAssetInput } from '@/lib/transmission/types';
import { AVContract } from '@/lib/dmtg/types';
import { FamilySituationSummary, PatrimoineSummary } from '@/types/transmission';
import { getPartSuccessorale, getPartConjointSuccession } from '@/lib/patrimoine/succession';
import { getFractionPassifAjustee, getPartConjointAjustee, buildAvantageMatrimonialCtx } from '@/lib/patrimoine/avantagesMatrimoniaux';
import { PatrimoineLigneCalcInput } from '@/lib/patrimoine/participationAcquets';
import { PatrimoineOriginaire, PatrimoineFinal } from '@/types/participationAcquets';
import { RecompenseCalcInput, CreanceCalcInput } from '@/lib/patrimoine/recompensesCreances';
import { Recompense } from '@/types/recompense';
import { CreanceEntreEpoux } from '@/types/creanceEntreEpoux';
import { ClausesData } from '@/types/matrimonial';
import { getAssetCategory } from '@/constants/assetTypes';
import { getAgeAtDate, getDemembrementPct } from '@/lib/transmission';
import { resolveEffectiveAVBeneficiaires } from '@/lib/dmtg/assurance-vie';
import { isDetenteurSpouse } from '@/lib/patrimoine/utils';
import { isRegimeCommunautaire } from '@/lib/patrimoine/qualification';

/**
 * Ligne liberalites brute (colonnes pertinentes uniquement), telle que
 * renvoyée par une lecture Supabase directe (Synthese.tsx) ou par
 * liberaliteService (ProcessusCalcul.tsx via useLiberalites) — les deux
 * partagent les mêmes noms de colonnes.
 */
export interface LiberaliteRow {
  id?: string | null;
  type: string;
  beneficiaire_id?: string | null;
  beneficiaire_nom: string;
  montant?: number | null;
  date_acte?: string | null;
  denomination: string;
  type_imputation?: string | null;
  biens?: unknown;
  pourcentage?: number | null;
  statut?: string | null;
}

interface AssetValeur {
  id?: string | null;
  valeur_estimee?: number | null;
}

export interface LegsCaduc {
  denomination: string;
  beneficiaireNom: string;
}

/**
 * Construit le Liberalite[] consommé par le moteur de calcul à partir des
 * lignes brutes de la table liberalites, en résolvant la valeur des legs par
 * jointure live vers les biens actuels (leur valeur n'est jamais figée en
 * base, contrairement aux donations — cf. décisions du chantier libéralités).
 * Un legs référençant un bien qui n'existe plus dans `assets` est considéré
 * caduc : exclu du calcul de transmission et renvoyé séparément pour
 * affichage. Limite connue : seule l'absence de la ligne asset est détectée,
 * pas un bien vendu mais toujours présent en base (assets n'a pas de statut
 * de cession fiable).
 *
 * Un même groupe de legs peut avoir plusieurs lignes référençant les mêmes
 * biens (un légataire par ligne) : la valeur de chaque ligne est proratisée
 * par `pourcentage` pour ne pas compter plusieurs fois la valeur totale des
 * biens. Les donations, elles, gardent leur `montant` déjà proratisé et figé
 * à la création, sans reproratisation ici.
 *
 * `excludeProjets` (défaut false) exclut les lignes `statut === 'projet'` :
 * à activer pour les calculs fiscaux/civils réels (Synthese.tsx,
 * Succession2ndDeces.tsx, ProcessusCalcul.tsx), à laisser absent pour un
 * écran de gestion qui doit afficher les deux statuts (Liberalites.tsx).
 */
export function buildTransmissionLiberalites(
  rows: LiberaliteRow[],
  assets: AssetValeur[],
  excludeProjets: boolean = false
): { liberalites: Liberalite[]; legsCaducs: LegsCaduc[] } {
  const assetsById = new Map(
    assets.filter((a): a is AssetValeur & { id: string } => !!a.id).map(a => [a.id, a])
  );

  const liberalites: Liberalite[] = [];
  const legsCaducs: LegsCaduc[] = [];

  const sourceRows = excludeProjets ? rows.filter(row => row.statut !== 'projet') : rows;

  for (const row of sourceRows) {
    const biens = Array.isArray(row.biens) ? (row.biens as { asset_id: string }[]) : [];

    let valeur: number;
    if (row.type === 'legs') {
      let caduc = false;
      let sommeBiens = 0;
      for (const bien of biens) {
        const asset = assetsById.get(bien.asset_id);
        if (!asset) {
          caduc = true;
          continue;
        }
        sommeBiens += Number(asset.valeur_estimee) || 0;
      }
      if (caduc) {
        legsCaducs.push({ denomination: row.denomination, beneficiaireNom: row.beneficiaire_nom });
        continue;
      }
      const pourcentage = row.pourcentage ?? 100;
      valeur = sommeBiens * (pourcentage / 100);
    } else {
      valeur = Number(row.montant) || 0;
    }

    liberalites.push({
      id: row.id || '',
      type: row.type as 'donation' | 'legs',
      beneficiaireId: row.beneficiaire_id || 'tiers',
      valeur,
      date: row.date_acte || new Date().toISOString().split('T')[0],
      typeImputation: (row.type_imputation as Liberalite['typeImputation']) || undefined,
      beneficiaireName: row.beneficiaire_nom
    });
  }

  return { liberalites, legsCaducs };
}

/**
 * Garde-fou dédié pour l'assurance-vie, sur le même modèle que
 * `BienNonQualifieError` (lib/patrimoine/succession.ts) : permet aux écrans
 * appelants (Synthese.tsx, ProcessusCalcul.tsx) de distinguer ce cas des
 * autres erreurs de calcul et d'afficher un message précis, plutôt que de
 * deviner une répartition avant/après 70 ans par défaut.
 */
export class AVDonneesInsuffisantesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AVDonneesInsuffisantesError';
  }
}

export interface AVOperationRow {
  type_operation: string;
  montant?: number | null;
  date_operation: string;
}

/**
 * Agrège les opérations d'un contrat AV en deux totaux de primes
 * (avant/après le 70e anniversaire du souscripteur), à partir de l'âge exact
 * du souscripteur à la date de chaque versement — jamais de son âge actuel.
 * Les rachats (`type_operation: 'rachat'`) ne sont pas des primes : exclus.
 *
 * Ne devine jamais une répartition par défaut (cf. CLAUDE.md, décisions
 * d'architecture IFI) : lève `AVDonneesInsuffisantesError` si le contrat n'a
 * aucun versement enregistré, ou si la date de naissance du souscripteur est
 * inconnue (sans elle, l'âge à chaque versement ne peut pas être calculé).
 */
export function splitPrimesAvantApres70(
  operations: AVOperationRow[],
  dateNaissance: string | null | undefined,
  contractLabel?: string
): { primesAvant70: number; primesApres70: number } {
  const label = contractLabel ? ` ${contractLabel}` : '';
  const versements = operations.filter(op => op.type_operation === 'versement');

  if (versements.length === 0) {
    throw new AVDonneesInsuffisantesError(
      `Aucune opération enregistrée pour le contrat${label} — impossible de déterminer la répartition avant/après 70 ans.`
    );
  }
  if (!dateNaissance) {
    throw new AVDonneesInsuffisantesError(
      `Date de naissance du souscripteur non renseignée — impossible de déterminer l'âge aux versements du contrat${label}.`
    );
  }

  const birthTime = new Date(dateNaissance).getTime();
  let primesAvant70 = 0;
  let primesApres70 = 0;

  for (const op of versements) {
    const ageAuVersement = (new Date(op.date_operation).getTime() - birthTime) / (365.25 * 24 * 60 * 60 * 1000);
    const montant = Number(op.montant) || 0;
    if (ageAuVersement < 70) {
      primesAvant70 += montant;
    } else {
      primesApres70 += montant;
    }
  }

  return { primesAvant70, primesApres70 };
}

export interface AVContractRawRow {
  assetId: string;
  label?: string | null;
  valeurEstimee?: number | null;
  // assets.detenteur (texte libre, 'user'/'spouse' par convention, cf.
  // lib/patrimoine/utils.ts::isDetenteurSpouse) — détenteur réel du contrat,
  // pour distinguer un contrat de l'Utilisateur de celui du conjoint
  // survivant (doctrine Ciot, §9.6.1).
  detenteur?: string | null;
  // av_contract_details.origine_fonds ('deniers_propres'/'deniers_communs') —
  // ne sert qu'à la réintégration civile d'un contrat non dénoué détenu par
  // le conjoint, sous régime de communauté.
  origineFonds?: string | null;
  operations: AVOperationRow[];
  // Structure identique à ClauseStructuree (av/ClauseBeneficiaireBuilder.tsx),
  // dupliquée ici en type minimal pour ne pas faire dépendre utils/ d'un
  // composant. Tous les niveaux sont désormais repris (cascade de
  // renonciation, cf. dmtg/assurance-vie.ts::resolveEffectiveAVBeneficiaires) —
  // `statut` gouverne la cascade, `typeDetention`/`nuProprietaireId` le
  // démembrement de la clause elle-même (distinct du démembrement civil de
  // la succession).
  clauseBeneficiaireStructuree?: {
    niveaux: Array<{
      beneficiaires: Array<{
        familyLinkId: string;
        pourcentage: number;
        statut?: 'accepte' | 'renoncant' | 'decede';
        typeDetention?: 'pleine-propriete' | 'usufruit';
        nuProprietaireId?: string;
      }>;
    }>;
  } | null;
}

/**
 * Construit les `AVContract[]` attendus par `computeDMTG` (dmtg/assurance-vie.ts)
 * à partir des lignes brutes `av_contract_details` + `av_operations`. Reprend
 * tous les niveaux de la clause bénéficiaire (cf. AVContractRawRow) — la
 * cascade de renonciation entre niveaux est résolue plus tard, au moment du
 * calcul (dmtg/assurance-vie.ts), pas ici.
 * `familyLinkId: 'conjoint'` (marqueur utilisé par ClauseBeneficiaireBuilder)
 * est traduit vers le vrai `family.survivingSpouseId` du graphe civil — les
 * deux ne partagent pas le même identifiant. Même traduction appliquée à
 * `nuProprietaireId` : un nu-propriétaire désigné peut lui aussi être "le
 * conjoint" au sens du formulaire.
 *
 * L'exonération conjoint/PACS (art. 990 I, 2e alinéa) est inconditionnelle en
 * droit : appliquée dès qu'un contrat désigne le conjoint survivant (comme
 * bénéficiaire ou comme nu-propriétaire), sans condition supplémentaire à
 * vérifier.
 *
 * Démembrement de la clause (bénéficiaire désigné en usufruit) : l'âge de
 * l'usufruitier à `referenceDate` (par défaut aujourd'hui, même convention
 * que computeTransmission) est résolu ici via `getAgeAtDate`/`getDemembrementPct`
 * (barème art. 669 CGI) — jamais dans dmtg/, qui reste agnostique des dates
 * de naissance (même séparation que pour l'usufruit civil de la succession).
 * Lève `AVDonneesInsuffisantesError` si la date de naissance de l'usufruitier
 * désigné est inconnue : jamais de démembrement deviné.
 */
export function buildAVContracts(
  rows: AVContractRawRow[],
  dateNaissance: string | null | undefined,
  family: FamilyGraph,
  referenceDate: string = new Date().toISOString().split('T')[0]
): AVContract[] {
  const resolveBeneficiaryId = (familyLinkId: string) =>
    familyLinkId === 'conjoint' ? (family.survivingSpouseId || familyLinkId) : familyLinkId;

  return rows.map(row => {
    const { primesAvant70, primesApres70 } = splitPrimesAvantApres70(
      row.operations,
      dateNaissance,
      row.label || undefined
    );

    const niveaux = (row.clauseBeneficiaireStructuree?.niveaux || []).map(niveau => ({
      beneficiaires: niveau.beneficiaires
        .filter(b => !!b.familyLinkId)
        .map(b => {
          const beneficiaryId = resolveBeneficiaryId(b.familyLinkId);
          const entry: AVContract['niveaux'][number]['beneficiaires'][number] = {
            beneficiaryId,
            quotePart: (b.pourcentage || 0) / 100,
            statut: b.statut
          };

          if (b.typeDetention === 'usufruit' && b.nuProprietaireId) {
            const usufruitier = family.persons.find(p => p.id === beneficiaryId);
            if (!usufruitier?.dateNaissance) {
              throw new AVDonneesInsuffisantesError(
                `Date de naissance de l'usufruitier désigné dans la clause bénéficiaire manquante${row.label ? ` (contrat ${row.label})` : ''} — impossible de valoriser l'usufruit (barème art. 669 CGI).`
              );
            }
            entry.typeDetention = 'usufruit';
            entry.nuProprietaireId = resolveBeneficiaryId(b.nuProprietaireId);
            entry.usufruitPct = getDemembrementPct(getAgeAtDate(usufruitier.dateNaissance, referenceDate), 'usufruit');
          }

          return entry;
        })
    }));

    const hasConjointBeneficiaire = niveaux.some(n =>
      n.beneficiaires.some(b => b.beneficiaryId === family.survivingSpouseId || b.nuProprietaireId === family.survivingSpouseId)
    );

    const hasExoneratedSiblingBeneficiaire = niveaux.some(n =>
      n.beneficiaires.some(b => {
        const isExonere = (id: string) => family.persons.find(p => p.id === id)?.exonerationSuccession === true;
        return isExonere(b.beneficiaryId) || (!!b.nuProprietaireId && isExonere(b.nuProprietaireId));
      })
    );

    return {
      id: row.assetId,
      niveaux,
      capitalDeces: Number(row.valeurEstimee) || 0,
      primesAvant70,
      primesApres70,
      isExonereBeneficiaireConjointPacs: hasConjointBeneficiaire,
      isSiblingExonEligible: hasExoneratedSiblingBeneficiaire,
      detenteur: isDetenteurSpouse(row.detenteur || undefined) ? 'spouse' : 'user',
      origineFonds: row.origineFonds === 'deniers_propres' ? 'deniers_propres' : 'deniers_communs'
    };
  });
}

/**
 * Valeur de rachat des contrats AV non dénoués du conjoint survivant à
 * réintégrer dans la masse commune à liquider civilement (doctrine Ciot,
 * §9.6.1) : uniquement sous régime de communauté, pour les contrats détenus
 * par `holderNonDenoue` (le détenteur qui n'est PAS le défunt simulé dans ce
 * calcul) dont l'origine des fonds est 'deniers_communs'. Un contrat financé
 * en 'deniers_propres' reste hors masse commune (bien propre du conjoint,
 * pas de récompense). Sous séparation de biens ou participation aux acquêts,
 * le contrat reste un bien propre du conjoint dans tous les cas : retourne
 * toujours 0.
 *
 * Le résultat alimente `TransmissionContext.avReintegrationCivileMontant`,
 * jamais `avContracts` (qui reste réservé au calcul fiscal 990I/757B d'un
 * contrat réellement dénoué par CE décès) — cf. commentaire de ce champ.
 */
export function computeAVReintegrationCivile(
  avContracts: AVContract[],
  holderNonDenoue: 'user' | 'spouse',
  regimeMatrimonial: string | null | undefined
): number {
  if (!isRegimeCommunautaire(regimeMatrimonial || undefined)) return 0;
  return avContracts
    .filter(c => c.detenteur === holderNonDenoue && c.origineFonds === 'deniers_communs')
    .reduce((sum, c) => sum + c.capitalDeces, 0);
}

// Schéma calqué sur ClauseState (src/types/matrimonial.ts:69-88). `.passthrough()`
// sur les objets pour ne jamais faire disparaître silencieusement un champ que ce
// schéma ignorerait : parseClausesData ré-alimente l'état édité par
// useMatrimonialClauses avant sa prochaine sauvegarde, donc une troncature ici se
// propagerait en base.
const clauseStateSchema = z
  .object({
    enabled: z.boolean(),
    selectedAssets: z.array(z.string()).optional(),
    partPleineProprietee: z.number().optional(),
    options: z
      .object({
        pleineProprietee: z.boolean().optional(),
        usufruit: z.boolean().optional(),
        residencePrincipale: z.boolean().optional(),
        maintienDivorce: z.boolean().optional(),
        porteSur: z.enum(['pleine_propriete', 'usufruit']).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const clausesDataSchema = z.record(z.string(), clauseStateSchema);

/**
 * Parse `marital_status.clauses_contrat` (texte JSON ou déjà objet selon le
 * point d'entrée Supabase) vers `ClausesData` — source unique de vérité pour
 * ce parsing, réutilisée à la fois par le formulaire de saisie
 * (useMatrimonialClauses.ts) et par tous les sites qui alimentent
 * `TransmissionContext.clausesData` (cf. lib/transmission/index.ts), pour
 * qu'ils ne divergent jamais sur la façon de lire cette colonne.
 *
 * Valide la forme via Zod (clauseStateSchema/clausesDataSchema) : en cas de
 * structure invalide, retombe sur `{}`, comme le faisait déjà le catch de
 * JSON.parse ci-dessous — cohérent avec la façon dont tous les appelants
 * traitent déjà une absence de clauses (`clausesData['x']?.enabled` etc.).
 */
export function parseClausesData(clausesContratRaw: unknown): ClausesData {
  if (!clausesContratRaw) return {};
  try {
    const parsed =
      typeof clausesContratRaw === 'string' ? JSON.parse(clausesContratRaw) : clausesContratRaw;
    const result = clausesDataSchema.safeParse(parsed);
    if (!result.success) {
      if (import.meta.env.DEV) {
        console.error('clauses_contrat invalide selon le schéma Zod:', result.error);
      }
      return {};
    }
    return result.data as ClausesData;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Erreur de parsing clauses_contrat:', error);
    }
    return {};
  }
}

/**
 * Le couple a-t-il une donation au dernier vivant / donation entre époux ?
 */
export function hasDDV(
  maritalStatus: Pick<MaritalStatus, 'donation_dernier_vivant_personne' | 'donation_dernier_vivant_conjoint'> | null | undefined
): boolean {
  return !!maritalStatus?.donation_dernier_vivant_personne || !!maritalStatus?.donation_dernier_vivant_conjoint;
}

/**
 * Le couple a-t-il au moins un enfant non commun (issu d'un premier lit) ?
 * Même critère que `childrenCommonWithSpouse` plus bas (parent_de ===
 * 'both_parents' pour un enfant commun) — ici on teste juste le
 * complément, indépendamment de tout FamilyGraph/décédent particulier,
 * pour les besoins des alertes de conseil (§12.8, art. 1094-1).
 */
export function hasNonCommonChildren(familyLinks: FamilyLink[]): boolean {
  return familyLinks.some(
    (link) => link.lien_familial === 'Enfant' && link.parent_de !== 'both_parents'
  );
}

/**
 * Traduit la valeur brute du <Select> "Renonce à la succession de"
 * ('user' | 'spouse' | 'both', cf. useFamilyLinkLogic.ts::getParentsForRenunciation
 * et enfant_renoncant_de en base) vers l'id réel du défunt concerné, tel
 * qu'attendu par successionLegale.ts (`child.renoncantDe === graph.decedentId`).
 * 'both' se résout à l'id du défunt COURANT : buildFamilyGraph et
 * buildSpouseAsDecedentFamilyGraph sont chacune appelées avec un decedentId
 * différent (chaînage 2nd décès), donc 'both' matche naturellement dans les
 * deux graphes construits successivement pour un même enfant renonçant.
 */
function resolveRenoncantDe(
  raw: string | null | undefined,
  ownRole: 'user' | 'spouse',
  ownDecedentId: PersonId,
  otherDecedentId: PersonId
): PersonId | undefined {
  if (!raw) return undefined;
  if (raw === ownRole || raw === 'both') return ownDecedentId;
  return otherDecedentId;
}

/**
 * Converts family data from the database to the transmission library format
 */
export function buildFamilyGraph(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyLinks: FamilyLink[]
): FamilyGraph {
  if (!familyProfile?.id) {
    throw new Error('buildFamilyGraph requires a familyProfile with an id');
  }

  const decedentId = familyProfile.id;
  const persons: Person[] = [{
    id: decedentId,
    nom: familyProfile.nom || 'Utilisateur',
    prenom: familyProfile.prenom || '',
    dateNaissance: familyProfile.date_naissance,
    estDecede: false,
    handicap: familyProfile.personne_handicapee || false,
    lienFamilial: 'decedent'
  }];

  const links: FamilyGraph['links'] = [];
  const marriages: FamilyGraph['marriages'] = [];

  let hasSurvivingSpouse = false;
  let survivingSpouseId: string | undefined;

  if (maritalStatus?.statut_couple &&
      ['Marié(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple)) {
    const spouseId = `conjoint-${decedentId}`;
    persons.push({
      id: spouseId,
      nom: maritalStatus.nom_conjoint || 'Conjoint',
      prenom: maritalStatus.prenom_conjoint || '',
      dateNaissance: maritalStatus.date_naissance_conjoint,
      estDecede: false,
      lienFamilial: 'conjoint'
    });
    hasSurvivingSpouse = true;
    survivingSpouseId = spouseId;

    links.push({ from: decedentId, to: spouseId, relation: 'spouse' });
    marriages.push({ spouseA: decedentId, spouseB: spouseId, regime: maritalStatus.regime_matrimonial });
  }

  const childrenOfDecedent: string[] = [];
  const childrenCommonWithSpouse: string[] = [];

  familyLinks.forEach(link => {
    // Enfant exclusif du conjoint (parent_de === 'spouse') : n'est pas un
    // enfant de l'Utilisateur, ne doit pas hériter de SA succession à lui —
    // même filtre que buildSpouseAsDecedentFamilyGraph côté miroir, pour ne
    // pas diverger entre les deux fonctions. `parent_de` absent/null (lignes
    // créées avant l'introduction du champ, ou jamais renseigné) garde le
    // comportement historique : traité comme un enfant de l'Utilisateur par
    // défaut, seule la valeur explicite 'spouse' exclut désormais.
    if (link.lien_familial === 'Enfant' && link.parent_de === 'spouse') {
      return;
    }

    persons.push({
      id: link.id!,
      nom: link.nom,
      prenom: link.prenom || '',
      dateNaissance: link.date_naissance,
      estDecede: link.est_decede || false,
      dateDeces: link.date_deces,
      handicap: link.handicap || false,
      lienFamilial: link.lien_familial,
      renoncant: link.enfant_renoncant || false,
      renoncantDe: resolveRenoncantDe(link.enfant_renoncant_de, 'user', decedentId, `conjoint-${decedentId}`),
      enfantAdopte: link.enfant_adopte || undefined,
      adoptionSimpleAbattementPlein: link.adoption_simple_abattement_plein || false,
      brancheFamiliale: link.branche_familiale || undefined,
      exonerationSuccession: link.exoneration_succession || false
    });

    // Enfant direct du défunt : le lien vers le défunt doit exister que
    // l'enfant soit vivant, décédé ou renonçant — successionLegale.ts a
    // besoin des enfants décédés/renonçants dans le graphe pour faire
    // jouer la représentation de leurs propres descendants (sinon la
    // souche disparaît à tort faute de lien exploitable).
    if (link.lien_familial === 'Enfant') {
      const childId = link.id!;
      childrenOfDecedent.push(childId);
      links.push({ from: decedentId, to: childId, relation: 'child' });

      if (link.parent_de === 'both_parents') {
        childrenCommonWithSpouse.push(childId);
      }
    }

    // Petit-enfant / arrière petit-enfant / neveu-nièce / petit neveu-nièce :
    // enfant_de contient l'id du lien family_links du parent immédiat (pas
    // l'id du défunt) — même mécanisme de chaînage pour toutes les
    // générations descendantes, que ce soit la lignée du défunt
    // (collectRepresentantsRecursive via buildSouchesEnfants) ou celle
    // d'un frère/sœur prédécédé (même fonction, via buildSouchesFratrie).
    // Sans ce lien, une souche décédée/renonçante disparaît à tort au lieu
    // d'être représentée par ses propres descendants.
    if (
      [
        'Petit-enfant',
        'Arrière petit-enfant',
        'Neveu/Nièce',
        'Petit neveu/nièce',
      ].includes(link.lien_familial) &&
      link.enfant_de
    ) {
      links.push({ from: link.enfant_de, to: link.id!, relation: 'child' });
    }
  });

  return {
    persons,
    links,
    marriages,
    decedentId,
    hasSurvivingSpouse,
    survivingSpouseId,
    childrenOfDecedent,
    childrenCommonWithSpouse,
    hasDDV: hasDDV(maritalStatus)
  };
}

/**
 * Garde-fou dédié : la succession propre du conjoint survivant (chaînage
 * 2nd décès) n'est modélisable ici que via ses propres enfants — ce module
 * ne représente nulle part les parents/frères et sœurs DU CONJOINT (seuls
 * ceux de l'Utilisateur existent dans family_links, cf.
 * useFamilyLinkLogic.ts::getParentsForRenunciation, qui n'offre aucune
 * option pour déclarer une ascendance ou une fratrie propre au conjoint).
 * Si le conjoint n'a aucun enfant modélisé, sa dévolution légale (parents,
 * fratrie, fente successorale) ne peut pas être calculée avec les données
 * actuellement disponibles — jamais deviné, on lève cette erreur dédiée
 * plutôt que de retomber silencieusement sur un résultat faux (succession
 * vide ou attribuée à personne).
 */
export class SpouseSuccessionNonModelisableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpouseSuccessionNonModelisableError';
  }
}

/**
 * Construit le FamilyGraph du conjoint survivant comme DÉFUNT (2nd décès du
 * chaînage, cf. lib/transmission/index.ts::computeChainedTransmission) — le
 * conjoint n'a plus de conjoint vivant (hasSurvivingSpouse: false), et ses
 * enfants sont ceux dont il est réellement parent (`parent_de` vaut 'spouse'
 * ou 'both_parents'), jamais un enfant exclusif de l'Utilisateur
 * (`parent_de === 'user'`) — à la différence de `buildFamilyGraph` qui
 * n'opère jamais dans ce sens et n'a donc pas besoin de ce filtre.
 */
export function buildSpouseAsDecedentFamilyGraph(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyLinks: FamilyLink[]
): FamilyGraph {
  if (!familyProfile?.id) {
    throw new Error('buildSpouseAsDecedentFamilyGraph requires a familyProfile with an id');
  }
  if (!maritalStatus?.statut_couple || !['Marié(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple)) {
    throw new Error('buildSpouseAsDecedentFamilyGraph requires an existing spouse (statut_couple Marié(e)/Pacsé(e))');
  }

  const decedentId = `conjoint-${familyProfile.id}`;
  const persons: Person[] = [{
    id: decedentId,
    nom: maritalStatus.nom_conjoint || 'Conjoint',
    prenom: maritalStatus.prenom_conjoint || '',
    dateNaissance: maritalStatus.date_naissance_conjoint,
    estDecede: false,
    handicap: maritalStatus.personne_handicapee_conjoint || false,
    lienFamilial: 'decedent'
  }];

  const links: FamilyGraph['links'] = [];
  const childrenOfDecedent: string[] = [];

  familyLinks.forEach(link => {
    const estEnfantDuConjoint = link.lien_familial === 'Enfant' && link.parent_de !== 'user';

    if (link.lien_familial === 'Enfant' && !estEnfantDuConjoint) {
      // Enfant exclusif de l'Utilisateur (parent_de === 'user') : n'est pas
      // un enfant du conjoint, ne doit pas hériter de sa succession à lui.
      return;
    }

    persons.push({
      id: link.id!,
      nom: link.nom,
      prenom: link.prenom || '',
      dateNaissance: link.date_naissance,
      estDecede: link.est_decede || false,
      dateDeces: link.date_deces,
      handicap: link.handicap || false,
      lienFamilial: link.lien_familial,
      renoncant: link.enfant_renoncant || false,
      renoncantDe: resolveRenoncantDe(link.enfant_renoncant_de, 'spouse', decedentId, familyProfile.id),
      enfantAdopte: link.enfant_adopte || undefined,
      adoptionSimpleAbattementPlein: link.adoption_simple_abattement_plein || false,
      brancheFamiliale: link.branche_familiale || undefined,
      exonerationSuccession: link.exoneration_succession || false
    });

    if (link.lien_familial === 'Enfant') {
      const childId = link.id!;
      childrenOfDecedent.push(childId);
      links.push({ from: decedentId, to: childId, relation: 'child' });
    }

    // Même mécanisme de chaînage descendant que buildFamilyGraph, pour la
    // représentation d'un enfant du conjoint prédécédé/renonçant.
    if (
      ['Petit-enfant', 'Arrière petit-enfant'].includes(link.lien_familial) &&
      link.enfant_de
    ) {
      links.push({ from: link.enfant_de, to: link.id!, relation: 'child' });
    }
  });

  if (childrenOfDecedent.length === 0) {
    throw new SpouseSuccessionNonModelisableError(
      "Le conjoint survivant n'a aucun enfant renseigné dans le module Famille : sa succession propre (parents, frères/sœurs) n'est pas modélisable dans cette version — seule sa filiation avec ses propres enfants est prise en charge."
    );
  }

  return {
    persons,
    links,
    marriages: [],
    decedentId,
    hasSurvivingSpouse: false,
    childrenOfDecedent,
    childrenCommonWithSpouse: [],
    hasDDV: hasDDV(maritalStatus)
  };
}

/**
 * Ligne de passif telle que consommée par les constructeurs de
 * `PatrimonySnapshot` ci-dessous : seuls `montant_du` et `qualification_bien`
 * sont lus (jamais `detenteur` ni les pourcentages).
 */
export interface PassifLine {
  montant_du: number;
  qualification_bien?: string | null;
}

/**
 * Fusionne les deux tables de passif du projet en une seule liste homogène :
 * `passifs` (colonne `montant_du`) et `emprunts` (colonne `capital_restant_du`).
 *
 * Jusqu'ici seuls les `passifs` alimentaient le calcul de transmission : un
 * crédit en cours n'était déduit ni de la masse successorale civile, ni de
 * l'assiette DMTG, ni de la base du droit de partage (trou relevé à l'audit
 * du module Patrimoine/Transmission). Ce point de fusion unique évite de
 * dupliquer le mapping sur les six appels concernés, et garantit que tous les
 * écrans (Synthèse, Processus de calcul, 2nd décès, Assurance-vie) partent du
 * même passif.
 *
 * Règles portées ici :
 * - Les emprunts rattachés à une société (`societe_id` non nul) sont exclus :
 *   ce sont des passifs de la personne morale, déjà pris en compte dans la
 *   valorisation des parts — les compter ici serait un double emploi.
 * - Aucune pondération n'est appliquée : `montant_du` est repris brut, la
 *   pondération éventuelle reste du ressort de l'appelant (cf.
 *   `buildPatrimonySnapshot`, qui applique `getFractionPassifAjustee`).
 * - Part du capital restant dû couverte par l'assurance décès (deux
 *   mécanismes non cumulables, `capital_garanti_deces` prime sur la
 *   quotité) : déduite ICI, avant le mapping vers `PassifLine`, uniquement
 *   si `defunt` est fourni — l'assureur rembourse directement le créancier,
 *   ce montant ne doit pas apparaître comme passif transmis à la succession
 *   de la personne dont c'est le décès (`defunt`). Sans `defunt` (appelants
 *   historiques, ex. tests), comportement inchangé : `montant_du` brut.
 */
export function buildPassifLines(
  passifs: { montant_du?: number | null; qualification_bien?: string | null }[],
  emprunts: {
    capital_restant_du?: number | null;
    qualification_bien?: string | null;
    societe_id?: string | null;
    capital_garanti_deces?: number | null;
    quotite_assuree_utilisateur?: number | null;
    quotite_assuree_conjoint?: number | null;
  }[],
  defunt?: 'user' | 'spouse'
): PassifLine[] {
  return [
    ...passifs.map(p => ({
      montant_du: p.montant_du || 0,
      qualification_bien: p.qualification_bien
    })),
    ...emprunts
      .filter(e => !e.societe_id)
      .map(e => {
        const capitalRestantDu = e.capital_restant_du || 0;

        if (!defunt) {
          return { montant_du: capitalRestantDu, qualification_bien: e.qualification_bien };
        }

        const quotiteAssuree = defunt === 'spouse'
          ? e.quotite_assuree_conjoint
          : e.quotite_assuree_utilisateur;

        let montantAssure = 0;
        if (e.capital_garanti_deces != null) {
          montantAssure = e.capital_garanti_deces;
        } else if (quotiteAssuree != null) {
          const quotiteClampee = Math.min(100, Math.max(0, quotiteAssuree));
          montantAssure = capitalRestantDu * (quotiteClampee / 100);
        }

        return {
          montant_du: Math.max(0, capitalRestantDu - montantAssure),
          qualification_bien: e.qualification_bien
        };
      })
  ];
}

/**
 * Converts asset data to patrimony snapshot for transmission calculations
 */
export function buildPatrimonySnapshot(
  assets: Asset[],
  passifs: { montant_du: number; qualification_bien?: string | null }[],
  assuranceVieTotal: number = 0,
  // Partage inégal (art. 1520 C. civ.) : seule clause dont l'effet est
  // symétrique entre actif et passif communs (art. 1521 C. civ.) — le
  // conjoint supportant une part inégale de l'actif commun en supporte le
  // même ratio au passif. Le préciput et l'attribution intégrale ne suivent
  // PAS cette symétrie (cf. lib/patrimoine/avantagesMatrimoniaux.ts::
  // getFractionPassifAjustee) : ce paramètre n'a donc d'effet que si une
  // clause de partage inégal est active, `null` par défaut = comportement
  // historique inchangé (passif commun compté à 100%, pas 50%).
  partConjointInegal: number | null = null
): PatrimonySnapshot {
  // Pondération par bien (régime matrimonial / indivision) : seule la part du
  // bien qui revient au défunt entre dans l'assiette successorale, cf.
  // lib/patrimoine/succession.ts::getPartSuccessorale (source unique de vérité,
  // partagée avec transmission/index.ts pour que le civil et le fiscal restent
  // alignés sur la même assiette).
  //
  // Les contrats d'assurance-vie sont hors succession civile (art. L132-13
  // code des assurances, hors primes manifestement exagérées — non modélisé,
  // hors périmètre) : exclus ici avec la même condition que dmtgAssets côté
  // fiscal (transmission/index.ts), pour que les deux assiettes restent
  // alignées. Sans cette exclusion, un contrat AV réel (une fois les
  // opérations renseignées) aurait été compté à la fois dans la masse
  // successorale civile ET dans `assuranceVieTotal` (double compte).
  const totalAssets = assets
    .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
    .reduce((sum, asset) => {
      const valeur = asset.valeur_estimee || asset.valeur_acquisition || 0;
      const partSuccessorale = getPartSuccessorale(asset, asset.denomination || asset.id);
      return sum + valeur * partSuccessorale;
    }, 0);

  const totalPassifs = passifs.reduce((sum, p) => {
    const fractionAjustee = getFractionPassifAjustee(
      { id: '', qualification_bien: p.qualification_bien },
      { partConjointInegal }
    );
    return sum + (p.montant_du || 0) * (fractionAjustee ?? 1);
  }, 0);

  return {
    date: new Date().toISOString().split('T')[0],
    biensExistants: totalAssets,
    passifs: totalPassifs,
    assuranceVieTotal
  };
}

/**
 * Capital net d'assurance-vie revenant à `beneficiaryId` sur un ensemble de
 * contrats, cascade de renonciation et démembrement de la clause déjà
 * résolus (cf. dmtg/assurance-vie.ts::resolveEffectiveAVBeneficiaires) — une
 * même personne peut apparaître plusieurs fois dans les parts effectives
 * d'un même contrat (ex. bénéficiaire d'une ligne et nu-propriétaire d'une
 * autre), d'où la sommation. Factorisé pour ne pas dupliquer cette
 * résolution entre `buildSurvivingSpousePatrimony` et `addReunifiedFullOwnership`.
 */
function capitalDecesNetPourBeneficiaire(
  avContracts: AVContract[],
  beneficiaryId: PersonId,
  prelev990I: number
): number {
  const capitalBrut = avContracts.reduce((sum, contract) => {
    const quotePart = resolveEffectiveAVBeneficiaires(contract.niveaux)
      .filter(share => share.beneficiaryId === beneficiaryId)
      .reduce((s, share) => s + share.quotePart, 0);
    return sum + contract.capitalDeces * quotePart;
  }, 0);
  return capitalBrut - prelev990I;
}

/**
 * Construit le patrimoine PROPRE du conjoint survivant à l'issue du 1er
 * décès, pour alimenter la 2nde succession chaînée (art. 1133 CGI —
 * chantier "chaînage 2nd décès", cf. lib/transmission/index.ts::
 * computeChainedTransmission).
 *
 * Mécanisme validé sur le cas-test Imeris Patrimoine (pages 6 et 25 de
 * l'étude de référence) : la masse fiscale du conjoint survivant à son
 * propre décès = son patrimoine propre uniquement (sa part de communauté
 * déjà détenue en pleine propriété + ce qu'il reçoit en pleine propriété au
 * 1er décès), SANS l'usufruit qu'il détenait sur la part du 1er défunt —
 * l'extinction de cet usufruit ne transite jamais par la succession du
 * conjoint (art. 617 C. civ.), elle est ajoutée hors taxation directement
 * sur la transmission nette des nu-propriétaires par computeChainedTransmission,
 * pas ici. Inclure l'usufruit réuni dans ce patrimoine produirait une
 * assiette fiscale fausse (double emploi avec cet ajout périphérique).
 *
 * Repondère les mêmes `assets` que `buildPatrimonySnapshot`, mais côté
 * conjoint (`getPartConjointSuccession`, miroir de `getPartSuccessorale`) —
 * aucune nouvelle logique de pondération, seule la sélection de sortie change.
 *
 * Limite connue sur le capital net d'assurance-vie : le prélèvement 990 I
 * du conjoint est soustrait du capital brut lui revenant, mais l'éventuelle
 * réintégration 757B (primes après 70 ans) n'est pas isolable ici — son
 * effet fiscal est déjà noyé dans les droits de la succession du 1er défunt
 * (`firstDeathResult.dmtg`), pas dans un prélèvement distinct sur l'AV.
 * Sans incidence sur le cas-test de référence (aucune prime après 70 ans),
 * mais à garder en tête si ce cas se présente.
 */
export function buildSurvivingSpousePatrimony(
  assets: Asset[],
  spousePassifs: { montant_du: number }[],
  firstDeathResult: TransmissionResult,
  survivingSpouseId: PersonId,
  avContracts: AVContract[] = []
): PatrimonySnapshot {
  const totalAssetsConjoint = assets
    .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
    .reduce((sum, asset) => {
      const valeur = asset.valeur_estimee || asset.valeur_acquisition || 0;
      const partConjoint = getPartConjointSuccession(asset, asset.denomination || asset.id);
      return sum + valeur * partConjoint;
    }, 0);

  // Pleine propriété reçue au 1er décès (héritage en PP + legs/donations
  // entre époux déjà maintenus) : déjà intégrée à `partFinale` par
  // computeTransmission — ne retenir que les lignes 'pleine_propriete' du
  // conjoint, jamais ses lignes 'usufruit' (cf. note ci-dessus).
  const ppRecueAuDeces = firstDeathResult.heirs
    .filter(h => h.personId === survivingSpouseId && h.typeQuotePart === 'pleine_propriete')
    .reduce((sum, h) => sum + h.partFinale, 0);

  const prelev990IConjoint = firstDeathResult.dmtg.perBeneficiary[survivingSpouseId]?.prelev990I || 0;
  const capitalDecesNetConjoint = capitalDecesNetPourBeneficiaire(avContracts, survivingSpouseId, prelev990IConjoint);

  const totalPassifsConjoint = spousePassifs.reduce((sum, p) => sum + (p.montant_du || 0), 0);

  return {
    date: new Date().toISOString().split('T')[0],
    biensExistants: totalAssetsConjoint + ppRecueAuDeces + Math.max(0, capitalDecesNetConjoint),
    passifs: totalPassifsConjoint,
    assuranceVieTotal: 0
  };
}

/**
 * Construit les `RawAssetInput[]` du conjoint survivant pour la 2nde
 * succession chaînée, à passer en `rawAssets` de `computeTransmission`.
 *
 * `computeTransmission` pondère TOUJOURS `rawAssets` avec `getPartSuccessorale`
 * (côté Utilisateur — logique interne non modifiable dans ce chantier, cf.
 * transmission/index.ts). Pour que la 2nde succession retombe sur la part du
 * CONJOINT et non sur celle de l'Utilisateur, la valeur est ici pré-pondérée
 * avec `getPartConjointSuccession`, puis `qualification_bien`/`detenteur`
 * sont neutralisés ('Bien propre', détenteur non-conjoint) pour que
 * `getPartSuccessorale` la relaisse passer à 100% sans la repondérer une
 * seconde fois côté Utilisateur (ce qui donnerait un résultat faux).
 * `nature` est conservée telle quelle : l'abattement résidence principale et
 * l'assiette immobilière (frais de notaire) doivent continuer à s'appliquer
 * normalement sur la part du conjoint.
 *
 * Avantages matrimoniaux (préciput, attribution intégrale, partage inégal) :
 * appliqués ICI, PENDANT que la vraie `qualification_bien` de chaque `asset`
 * est encore disponible (avant sa neutralisation à 'Bien propre' ci-dessous),
 * via `getPartConjointAjustee` (lib/patrimoine/avantagesMatrimoniaux.ts —
 * miroir de `getFractionAjustee`, pour le sens "le conjoint décède"). Sans
 * clause active concernant un bien donné, comportement inchangé
 * (`getPartConjointSuccession`). `clausesData`/`utilisateurDateNaissance`
 * sont optionnels pour ne rien changer aux appelants existants qui ne les
 * fournissent pas encore.
 */
export function buildSpouseRawAssets(
  assets: Asset[],
  clausesData?: ClausesData,
  utilisateurDateNaissance?: string | null,
  referenceDate: string = new Date().toISOString().split('T')[0]
): RawAssetInput[] {
  // npSurvivant = nue-propriété (barème art. 669 CGI) du SURVIVANT réel de ce
  // sens de décès simulé, càd l'UTILISATEUR (c'est le conjoint qui décède
  // ici) — jamais l'âge du conjoint, cf. getPartConjointAjustee. Résolu
  // paresseusement par buildAvantageMatrimonialCtx, uniquement si une clause
  // en modalité usufruit est réellement active.
  const avantageMatrimonialCtx = buildAvantageMatrimonialCtx(clausesData, () => {
    if (!utilisateurDateNaissance) {
      throw new Error(
        "Date de naissance de l'utilisateur manquante : impossible de valoriser l'usufruit (barème art. 669 CGI) pour la clause matrimoniale côté conjoint."
      );
    }
    return getDemembrementPct(getAgeAtDate(utilisateurDateNaissance, referenceDate), 'nue_propriete');
  });

  return assets
    .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
    .map(asset => {
      const partConjoint = avantageMatrimonialCtx
        ? getPartConjointAjustee(
            { id: asset.id!, qualification_bien: asset.qualification_bien },
            avantageMatrimonialCtx
          ) ?? getPartConjointSuccession(asset, asset.denomination || asset.id)
        : getPartConjointSuccession(asset, asset.denomination || asset.id);

      return {
        id: asset.id!,
        denomination: asset.denomination,
        valeur_estimee: (asset.valeur_estimee || asset.valeur_acquisition || 0) * partConjoint,
        nature: asset.nature,
        qualification_bien: 'Bien propre',
        detenteur: undefined
      };
    });
}

/**
 * Patrimoine PROPRE du conjoint AVANT tout décès (part de communauté déjà en
 * pleine propriété + ses propres biens), sans aucun ajout post-décès — sert
 * de contexte de 1er décès quand l'ordre inversé (conjoint décède en premier)
 * est simulé. Factorisé séparément de `buildSurvivingSpousePatrimony` (qui
 * ajoute la PP/l'AV reçues) pour ne pas modifier cette dernière, déjà
 * couverte par des tests (secondDeces.test.ts) — même pondération
 * (getPartConjointSuccession), dupliquée ici sciemment plutôt que
 * refactorée, pour ne pas risquer de régression sur du code déjà validé.
 */
export function buildSpouseOwnBasePatrimony(
  assets: Asset[],
  spousePassifs: { montant_du: number }[]
): PatrimonySnapshot {
  const totalAssetsConjoint = assets
    .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
    .reduce((sum, asset) => {
      const valeur = asset.valeur_estimee || asset.valeur_acquisition || 0;
      return sum + valeur * getPartConjointSuccession(asset, asset.denomination || asset.id);
    }, 0);
  const totalPassifs = spousePassifs.reduce((sum, p) => sum + (p.montant_du || 0), 0);

  return {
    date: new Date().toISOString().split('T')[0],
    biensExistants: totalAssetsConjoint,
    passifs: totalPassifs,
    assuranceVieTotal: 0
  };
}

/**
 * Ajoute au patrimoine de base d'un survivant (`base`, déjà pondéré côté
 * Utilisateur OU côté conjoint selon l'ordre simulé — cette fonction est
 * agnostique du sens) ce qu'il reçoit en pleine propriété + son capital net
 * d'assurance-vie à l'issue du 1er décès de ce chaînage — sans l'usufruit
 * réuni (cf. buildSurvivingSpousePatrimony pour le détail du raisonnement).
 * Version générique de l'ajout déjà fait dans `buildSurvivingSpousePatrimony`,
 * pour l'ordre inversé (Utilisateur veuf, 2nd décès) sans dupliquer
 * `buildSurvivingSpousePatrimony` elle-même côté conjoint.
 */
export function addReunifiedFullOwnership(
  base: PatrimonySnapshot,
  firstDeathResult: TransmissionResult,
  survivorId: PersonId,
  avContracts: AVContract[] = []
): PatrimonySnapshot {
  const ppRecue = firstDeathResult.heirs
    .filter(h => h.personId === survivorId && h.typeQuotePart === 'pleine_propriete')
    .reduce((sum, h) => sum + h.partFinale, 0);

  const prelev990I = firstDeathResult.dmtg.perBeneficiary[survivorId]?.prelev990I || 0;
  const capitalDecesNet = capitalDecesNetPourBeneficiaire(avContracts, survivorId, prelev990I);

  return {
    ...base,
    biensExistants: base.biensExistants + ppRecue + Math.max(0, capitalDecesNet)
  };
}

/**
 * Transforme le FamilyGraph "Utilisateur défunt, conjoint vivant" (celui que
 * produit `buildFamilyGraph`) en graphe "Utilisateur défunt veuf" — pour le
 * 2nd décès de l'ordre inversé (le conjoint est déjà décédé dans ce chaînage,
 * `hasSurvivingSpouse` doit être false, sans quoi la dévolution légale
 * routerait à tort vers la branche "défunt marié" avec un conjoint déjà
 * mort). Retire aussi les enfants exclusifs du conjoint (`parent_de ===
 * 'spouse'`), qui ne sont jamais des enfants de l'Utilisateur — même filtre
 * que `buildSpouseAsDecedentFamilyGraph` côté miroir. Ne modifie pas
 * `buildFamilyGraph` elle-même (déjà utilisée telle quelle par tout le reste
 * de l'app pour le 1er décès) : simple transformation de son résultat.
 */
export function widowFamilyGraph(graph: FamilyGraph, familyLinks: FamilyLink[]): FamilyGraph {
  const spouseOnlyChildIds = new Set(
    familyLinks
      .filter(l => l.lien_familial === 'Enfant' && l.parent_de === 'spouse')
      .map(l => l.id)
  );
  const spouseId = graph.survivingSpouseId;

  return {
    ...graph,
    persons: graph.persons.filter(p => p.id !== spouseId && !spouseOnlyChildIds.has(p.id)),
    links: graph.links.filter(l => l.to !== spouseId && !spouseOnlyChildIds.has(l.to as string)),
    marriages: [],
    hasSurvivingSpouse: false,
    survivingSpouseId: undefined,
    childrenOfDecedent: graph.childrenOfDecedent.filter(id => !spouseOnlyChildIds.has(id)),
    childrenCommonWithSpouse: []
  };
}

/**
 * Creates a summary of the family situation for display
 */
export function createFamilySummary(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyLinks: FamilyLink[]
): FamilySituationSummary {
  return {
    decedent: {
      nom: familyProfile?.nom || 'Non renseigné',
      prenom: familyProfile?.prenom || 'Non renseigné',
      regimeMatrimonial: maritalStatus?.regime_matrimonial
    },
    conjoint: maritalStatus && maritalStatus.statut_couple && 
      ['Marié(e)', 'Pacsé(e)', 'MARIE', 'PACS', 'PACSE'].includes(maritalStatus.statut_couple) ? {
      nom: maritalStatus.nom_conjoint || 'Non renseigné',
      prenom: maritalStatus.prenom_conjoint || 'Non renseigné',
      vivant: true
    } : undefined,
    enfants: familyLinks
      .filter(link => link.lien_familial === 'Enfant')
      .map(child => ({
        id: child.id || '',
        nom: child.nom,
        prenom: child.prenom || '',
        vivant: !child.est_decede,
        branche: child.branche_familiale === 'Précédent lit' ? 'precedente' : 'commune'
      })),
    autres: familyLinks
      .filter(link => link.lien_familial !== 'Enfant')
      .map(person => ({
        id: person.id || '',
        nom: person.nom,
        lien: person.lien_familial,
        vivant: !person.est_decede
      }))
  };
}

/**
 * Creates a summary of the patrimony for display
 */
export function createPatrimoinySummary(assets: Asset[]): PatrimoineSummary {
  const summary = {
    total: 0,
    immobilier: 0,
    financier: 0,
    professionnel: 0,
    autres: 0
  };

  assets.forEach(asset => {
    const value = asset.valeur_estimee || asset.valeur_acquisition || 0;
    summary.total += value;

    // Categorize based on asset nature
    const nature = asset.nature?.toLowerCase() || '';
    if (nature.includes('immobilier') || nature.includes('résidence') || nature.includes('terrain')) {
      summary.immobilier += value;
    } else if (nature.includes('compte') || nature.includes('placement') || nature.includes('action')) {
      summary.financier += value;
    } else if (nature.includes('fonds') || nature.includes('entreprise') || nature.includes('profession')) {
      summary.professionnel += value;
    } else {
      summary.autres += value;
    }
  });

  const passifs = 0; // TODO: Calculate from asset charges

  return {
    actifs: summary,
    passifs,
    actifNet: summary.total - passifs,
    assuranceVie: 0 // TODO: Extract from specific asset types
  };
}

/**
 * Construit le contexte `participationAcquets` attendu par
 * `computeTransmission` à partir des lignes brutes Supabase
 * (`patrimoine_originaire`/`patrimoine_final`) et du booléen d'exclusion des
 * biens professionnels déjà résolu par l'appelant.
 *
 * Prend volontairement ce booléen en paramètre plutôt que `ClausesData` en
 * entier : ce module ne doit jamais réexposer l'objet clauses complet vers un
 * contexte "conjoint décède en premier" (cf. commentaire de
 * TransmissionContext.participationAcquets sur le risque de double
 * pondération par bien si clausesData y était transmis).
 */
export function buildParticipationAcquetsContext(
  patrimoineOriginaireRows: PatrimoineOriginaire[],
  patrimoineFinalRows: PatrimoineFinal[],
  exclusionBiensProfessionnels: boolean
): {
  patrimoineOriginaire: PatrimoineLigneCalcInput[];
  patrimoineFinal: PatrimoineLigneCalcInput[];
  exclusionBiensProfessionnels: boolean;
} {
  const toLigneCalcInput = (row: PatrimoineOriginaire | PatrimoineFinal): PatrimoineLigneCalcInput => ({
    epoux: row.epoux,
    valeur: row.valeur,
    bienProfessionnel: row.bien_professionnel
  });

  return {
    patrimoineOriginaire: patrimoineOriginaireRows.map(toLigneCalcInput),
    patrimoineFinal: patrimoineFinalRows.map(toLigneCalcInput),
    exclusionBiensProfessionnels
  };
}

/**
 * Mappe les lignes brutes Supabase (`recompenses`, snake_case) vers les
 * entrées attendues par computeSoldeRecompenses (camelCase) — aucun mapper de
 * ce type n'existait avant ce chantier, y compris sur Succession2ndDeces.tsx
 * (recompenses/creancesEntreEpoux n'y sont pas branchés).
 */
export function buildRecompensesCalcInput(rows: Recompense[]): RecompenseCalcInput[] {
  return rows.map(r => ({
    sens: r.sens,
    epoux: r.epoux,
    depenseFaite: r.depense_faite,
    valeurBienAcquisition: r.valeur_bien_acquisition,
    valeurBienLiquidation: r.valeur_bien_liquidation,
    natureDepense: r.nature_depense,
    modeEvaluationConventionnel: r.mode_evaluation_conventionnel
  }));
}

/**
 * Mappe les lignes brutes Supabase (`creances_entre_epoux`, snake_case) vers
 * les entrées attendues par computeSoldeCreancesEntreEpoux (camelCase).
 */
export function buildCreancesCalcInput(rows: CreanceEntreEpoux[]): CreanceCalcInput[] {
  return rows.map(c => ({
    epouxCreancier: c.epoux_creancier,
    epouxDebiteur: c.epoux_debiteur,
    depenseFaite: c.depense_faite,
    valeurBienAvant: c.valeur_bien_avant,
    valeurBienApres: c.valeur_bien_apres,
    natureDepense: c.nature_depense,
    modeEvaluationConventionnel: c.mode_evaluation_conventionnel
  }));
}