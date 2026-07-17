import { FamilyLink, MaritalStatus, FamilyProfile } from '@/services/familyService';
import { Asset } from '@/services/assetService';
import { FamilyGraph, Person, PatrimonySnapshot, Liberalite } from '@/lib/transmission/types';
import { FamilySituationSummary, PatrimoineSummary } from '@/types/transmission';
import { getPartSuccessorale } from '@/lib/patrimoine/succession';

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
 */
export function buildTransmissionLiberalites(
  rows: LiberaliteRow[],
  assets: AssetValeur[]
): { liberalites: Liberalite[]; legsCaducs: LegsCaduc[] } {
  const assetsById = new Map(
    assets.filter((a): a is AssetValeur & { id: string } => !!a.id).map(a => [a.id, a])
  );

  const liberalites: Liberalite[] = [];
  const legsCaducs: LegsCaduc[] = [];

  for (const row of rows) {
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
      renoncantDe: link.enfant_renoncant_de || undefined,
      enfantAdopte: link.enfant_adopte || undefined,
      adoptionSimpleAbattementPlein: link.adoption_simple_abattement_plein || false,
      brancheFamiliale: link.branche_familiale || undefined
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

  const hasDDV = !!maritalStatus?.donation_dernier_vivant_personne ||
    !!maritalStatus?.donation_dernier_vivant_conjoint;

  return {
    persons,
    links,
    marriages,
    decedentId,
    hasSurvivingSpouse,
    survivingSpouseId,
    childrenOfDecedent,
    childrenCommonWithSpouse,
    hasDDV
  };
}

/**
 * Converts asset data to patrimony snapshot for transmission calculations
 */
export function buildPatrimonySnapshot(
  assets: Asset[],
  passifs: { montant_du: number }[],
  assuranceVieTotal: number = 0
): PatrimonySnapshot {
  // Pondération par bien (régime matrimonial / indivision) : seule la part du
  // bien qui revient au défunt entre dans l'assiette successorale, cf.
  // lib/patrimoine/succession.ts::getPartSuccessorale (source unique de vérité,
  // partagée avec transmission/index.ts pour que le civil et le fiscal restent
  // alignés sur la même assiette).
  const totalAssets = assets.reduce((sum, asset) => {
    const valeur = asset.valeur_estimee || asset.valeur_acquisition || 0;
    const partSuccessorale = getPartSuccessorale(asset, asset.denomination || asset.id);
    return sum + valeur * partSuccessorale;
  }, 0);

  const totalPassifs = passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0);

  return {
    date: new Date().toISOString().split('T')[0],
    biensExistants: totalAssets,
    passifs: totalPassifs,
    assuranceVieTotal
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