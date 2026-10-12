import { FamilyGraph, Person, PersonId, TypeQuotePart } from './types';

export interface HeritierLegal {
  personId: PersonId;
  nom: string;
  prenom: string;
  lien: string;
  quotePart: number;
  typeQuotePart: TypeQuotePart;
  ordre: number;
  representation?: boolean;
  // Renseignés uniquement quand representation === true : id de la
  // personne représentée (racine de la souche : enfant ou frère/sœur
  // prédécédé/renonçant) et nombre de représentants se partageant sa part
  // — nécessaires en aval pour le partage de l'abattement fiscal par
  // souche (art. 779 CGI).
  representationRootId?: PersonId;
  representationCount?: number;
}

export interface SuccessionLegaleResult {
  heritiers: HeritierLegal[];
  optionConjoint?: {
    quartPP: boolean;
    usufruitTotal: boolean;
    enfantsCommuns: boolean;
  };
  masseBrutePart: number;
  explicationsTexte: string[];
  // Nombre de souches d'enfants prises en compte pour la réserve héréditaire
  // (enfants vivants ou représentés ; un enfant décédé ou renonçant sans
  // descendance ne compte pas). 0 si le défunt n'a pas d'enfant.
  nbSouchesEnfants: number;
  // Ids des liens family_links 'Enfant' dont la souche est encore active
  // dans cette succession (utilisé pour l'imputation des libéralités sur
  // la réserve, cf. reserve.ts::imputeLiberalites).
  souchesEnfantsRootIds: PersonId[];
}

/**
 * Calcule la succession légale selon le droit français
 */
export function calculateSuccessionLegale(
  graph: FamilyGraph,
  hasTestament: boolean = false,
  optionConjoint?: string
): SuccessionLegaleResult {
  if (hasTestament) {
    return {
      heritiers: [],
      masseBrutePart: 0,
      explicationsTexte: ["Des dispositions testamentaires ou libéralités existent. La succession légale ne s'applique pas."],
      nbSouchesEnfants: 0,
      souchesEnfantsRootIds: []
    };
  }

  const result: SuccessionLegaleResult = {
    heritiers: [],
    masseBrutePart: 1,
    explicationsTexte: [],
    nbSouchesEnfants: 0,
    souchesEnfantsRootIds: []
  };

  const personnesVivantes = graph.persons.filter(p => !p.estDecede && p.id !== graph.decedentId);

  // BRANCHE A — Le défunt était marié
  if (graph.hasSurvivingSpouse && graph.survivingSpouseId) {
    return calculateBrancheA(graph, personnesVivantes, result, optionConjoint);
  }

  // BRANCHE B — Le défunt n'était pas marié
  return calculateBrancheB(graph, personnesVivantes, result);
}

// ─── BRANCHE A — Défunt marié ───────────────────────────────────────

function calculateBrancheA(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult,
  optionConjoint?: string
): SuccessionLegaleResult {
  const conjoint = personnesVivantes.find(p => p.id === graph.survivingSpouseId);
  if (!conjoint) return result;

  // A1. Y a-t-il des enfants (vivants ou représentés) ?
  const souchesEnfants = buildSouchesEnfants(graph, result);
  result.nbSouchesEnfants = souchesEnfants.length;
  result.souchesEnfantsRootIds = souchesEnfants.map(s => s.rootChildId);

  if (souchesEnfants.length > 0) {
    // Il y a des enfants vivants ou représentés
    const tousCommuns = souchesEnfants.every(s =>
      graph.childrenCommonWithSpouse.includes(s.rootChildId)
    );

    let conjointPart: number;
    let conjointTypeQuotePart: TypeQuotePart = 'pleine_propriete';
    let enfantsTypeQuotePart: TypeQuotePart = 'pleine_propriete';

    // Déterminer si DDV existe (on vérifie dans le graph si le mariage a une DDV)
    const hasDDV = !!graph.hasDDV;

    // Options du conjoint :
    // - sans DDV (art. 757) : 1/4 PP ou 100 % usufruit si tous les enfants sont communs,
    //   1/4 PP imposé dès qu'un enfant n'est pas commun ;
    // - avec DDV (art. 1094-1) : les options de la quotité spéciale entre époux sont
    //   ouvertes quelle que soit la filiation des enfants.
    const optionsOuvertes = tousCommuns || hasDDV;
    result.optionConjoint = {
      quartPP: true,
      usufruitTotal: optionsOuvertes,
      enfantsCommuns: tousCommuns
    };

    // Art. 1098 : un enfant non commun peut demander la conversion de l'usufruit
    // (rente viagère ou abandon de l'usufruit sur sa réserve). Faculté non exercée
    // d'office : simple information, sans effet sur les parts.
    const messageArt1098 =
      `Présence d'un enfant non commun : il peut demander la conversion de l'usufruit du conjoint en rente viagère, ou l'abandon de l'usufruit portant sur sa réserve (C. civ. art. 1098). Le calcul retient l'option choisie, sans cette conversion.`;

    if (optionsOuvertes && optionConjoint === 'usufruit_total') {
      conjointPart = 1.0;
      conjointTypeQuotePart = 'usufruit';
      enfantsTypeQuotePart = 'nue_propriete';
      result.explicationsTexte.push(
        `Le conjoint reçoit 100% en usufruit${tousCommuns ? '' : ' (donation au dernier vivant)'}. Les enfants reçoivent la nue-propriété.`
      );
      if (!tousCommuns) result.explicationsTexte.push(messageArt1098);
    } else if (optionConjoint === 'quart_pp_3quarts_us' && hasDDV) {
      // Le conjoint porte deux droits distincts : 1/4 en pleine propriété + usufruit sur le solde.
      // Les enfants reçoivent la nue-propriété uniquement sur les 3/4 grevés d'usufruit.
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.25, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.75, typeQuotePart: 'usufruit', ordre: 0
      });
      distributeToSouchesWithType(result, souchesEnfants, 0.75, 'nue_propriete');
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/4 en pleine propriété et l'usufruit sur les 3/4 restants (donation au dernier vivant). Les enfants reçoivent la nue-propriété sur ces 3/4.`
      );
      if (!tousCommuns) result.explicationsTexte.push(messageArt1098);
      return result;
    } else if (optionConjoint === 'qd_pp' && hasDDV) {
      const nbEnfants = souchesEnfants.length;
      conjointPart = nbEnfants === 1 ? 0.5 : nbEnfants === 2 ? 1/3 : 0.25;
      result.explicationsTexte.push(
        `Le conjoint reçoit la quotité disponible (${Math.round(conjointPart * 100)}%) en pleine propriété (donation au dernier vivant).`
      );
    } else if (tousCommuns || hasDDV) {
      // Par défaut ou quart_pp
      conjointPart = 0.25;
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/4 en pleine propriété. Les enfants se partagent les 3/4 restants.`
      );
    } else {
      // Au moins un enfant non commun, sans DDV → 1/4 PP obligatoire (art. 757)
      conjointPart = 0.25;
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/4 en pleine propriété (au moins un enfant non commun).`
      );
    }

    result.heritiers.push({
      personId: conjoint.id,
      nom: conjoint.nom,
      prenom: conjoint.prenom || '',
      lien: 'conjoint',
      quotePart: conjointPart,
      typeQuotePart: conjointTypeQuotePart,
      ordre: 0
    });

    // Enfants se partagent le solde par souche
    const solde = 1 - conjointPart;
    if (solde > 0) {
      distributeToSouchesWithType(result, souchesEnfants, solde, enfantsTypeQuotePart);
    } else {
      // Usufruit total: enfants reçoivent 100% en nue-propriété
      distributeToSouchesWithType(result, souchesEnfants, 1.0, enfantsTypeQuotePart);
    }

    if (solde > 0) {
      result.explicationsTexte.push(
        `Les enfants se partagent ${Math.round(solde * 100)}% à parts égales par souche.`
      );
    }
  } else {
    // A2. Pas d'enfant → vérifier les parents
    const parentsVivants = getParentsVivants(graph, personnesVivantes);

    if (parentsVivants.length === 2) {
      // Père ET mère vivants → Conjoint 1/2, chaque parent 1/4
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.5, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      parentsVivants.forEach(parent => {
        result.heritiers.push({
          personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
          lien: 'parent', quotePart: 0.25, typeQuotePart: 'pleine_propriete', ordre: 2
        });
      });
      result.explicationsTexte.push(`Le conjoint reçoit 1/2, chaque parent reçoit 1/4.`);
    } else if (parentsVivants.length === 1) {
      // Un seul parent → Conjoint 3/4, parent 1/4
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.75, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      result.heritiers.push({
        personId: parentsVivants[0].id, nom: parentsVivants[0].nom, prenom: parentsVivants[0].prenom || '',
        lien: 'parent', quotePart: 0.25, typeQuotePart: 'pleine_propriete', ordre: 2
      });
      result.explicationsTexte.push(`Le conjoint reçoit 3/4, le parent survivant reçoit 1/4.`);
    } else {
      // Aucun parent → Conjoint 100%
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 1.0, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      result.explicationsTexte.push(`Le conjoint hérite de la totalité (aucun descendant ni parent survivant).`);
    }
  }

  return result;
}

// ─── BRANCHE B — Défunt non marié ───────────────────────────────────

function calculateBrancheB(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult
): SuccessionLegaleResult {
  // B1. Y a-t-il des enfants vivants ou représentables ?
  const souchesEnfants = buildSouchesEnfants(graph, result);
  result.nbSouchesEnfants = souchesEnfants.length;
  result.souchesEnfantsRootIds = souchesEnfants.map(s => s.rootChildId);

  if (souchesEnfants.length > 0) {
    distributeToSouches(result, souchesEnfants, 1.0);
    result.explicationsTexte.push(`Les enfants héritent de la totalité à parts égales par souche.`);
    return result;
  }

  // B2. Filet de sécurité — petits-enfants/arrière-petits-enfants directs
  // (Normalement traité par la représentation en B1, sert de sécurité)
  const descendantsDirects = findAllLivingDescendants(graph, graph.decedentId);
  if (descendantsDirects.length > 0) {
    const part = 1.0 / descendantsDirects.length;
    descendantsDirects.forEach(d => {
      result.heritiers.push({
        personId: d.id, nom: d.nom, prenom: d.prenom || '',
        lien: 'petit_enfant', quotePart: part,
        typeQuotePart: 'pleine_propriete', ordre: 1, representation: true
      });
    });
    result.explicationsTexte.push(`Les descendants héritent à parts égales.`);
    return result;
  }

  // B3. Y a-t-il un ou deux parents vivants ?
  const parentsVivants = getParentsVivants(graph, personnesVivantes);
  const souchesFratrie = buildSouchesFratrie(graph, personnesVivantes);

  if (parentsVivants.length > 0) {
    if (souchesFratrie.length > 0) {
      // Parents + fratrie
      const partParent = 0.25;
      parentsVivants.forEach(parent => {
        result.heritiers.push({
          personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
          lien: 'parent', quotePart: partParent,
          typeQuotePart: 'pleine_propriete', ordre: 2
        });
      });
      const resteFratrie = 1.0 - (partParent * parentsVivants.length);
      distributeToSouchesFratrie(graph, result, souchesFratrie, resteFratrie);
      result.explicationsTexte.push(
        `Chaque parent reçoit 1/4, les frères/sœurs se partagent le reste (${Math.round(resteFratrie * 100)}%).`
      );
    } else {
      // Parents seuls, sans fratrie
      if (parentsVivants.length === 2) {
        parentsVivants.forEach(parent => {
          result.heritiers.push({
            personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
            lien: 'parent', quotePart: 0.5,
            typeQuotePart: 'pleine_propriete', ordre: 2
          });
        });
        result.explicationsTexte.push(`Chaque parent reçoit 1/2.`);
      } else {
        // Un seul parent, sans fratrie (art. 738-1) : moitié au parent, moitié
        // aux seuls ascendants de l'autre branche (le plus proche en degré) ;
        // à défaut, le parent prend tout. Les collatéraux ordinaires (4e
        // ordre) sont exclus par le parent (2e ordre, art. 734).
        const parent = parentsVivants[0];
        const ascendantsAutreLigne = getAscendantsAutreLigne(graph, personnesVivantes, parent);
        const partParent = ascendantsAutreLigne.length > 0 ? 0.5 : 1;
        result.heritiers.push({
          personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
          lien: 'parent', quotePart: partParent,
          typeQuotePart: 'pleine_propriete', ordre: 2
        });
        if (ascendantsAutreLigne.length > 0) {
          distributeFenteHeritiers(result, ascendantsAutreLigne, 0.5);
          result.explicationsTexte.push(
            `Le parent survivant reçoit 1/2, l'autre 1/2 revient aux ascendants les plus proches de l'autre branche (C. civ. art. 738-1).`
          );
        } else {
          result.explicationsTexte.push(
            `Le parent survivant reçoit la totalité : ni frère ou sœur, ni ascendant dans l'autre branche (C. civ. art. 738-1, 734).`
          );
        }
      }
    }
    return result;
  }

  // B4. Aucun parent. Y a-t-il des frères et sœurs (ou neveux/nièces) ?
  if (souchesFratrie.length > 0) {
    distributeToSouchesFratrie(graph, result, souchesFratrie, 1.0);
    result.explicationsTexte.push(`Les frères/sœurs héritent de la totalité à parts égales.`);
    return result;
  }

  // B5. La fente successorale
  applyFenteSuccessorale(result, personnesVivantes, 1.0);

  return result;
}

// ─── Représentation récursive des descendants ───────────────────────

interface Souche {
  rootChildId: PersonId;
  heritiers: Array<{ person: any; part: number; representation: boolean }>;
}

/**
 * Construit les souches d'enfants avec représentation récursive.
 * Chaque enfant direct du défunt forme une souche. Si l'enfant est vivant,
 * il hérite de sa souche entière. S'il est décédé, ses descendants le
 * représentent récursivement.
 */
function buildSouchesEnfants(graph: FamilyGraph, result?: SuccessionLegaleResult): Souche[] {
  const allDirectChildren = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'child')
    .map(link => link.to);

  const decedent = graph.persons.find(p => p.id === graph.decedentId);
  const souches: Souche[] = [];

  for (const childId of allDirectChildren) {
    const child = graph.persons.find(p => p.id === childId);
    if (!child) continue;

    // Renonciation à CETTE succession (art. 754 C. civ.) : n'a d'effet que
    // pour le défunt désigné par renoncantDe. L'enfant reste héritier pour
    // la succession de l'autre parent le cas échéant.
    const renonceACetteSuccession = !!child.renoncant && child.renoncantDe === graph.decedentId;
    const traiterCommePredecede = !!child.estDecede || renonceACetteSuccession;

    if (!traiterCommePredecede) {
      // Enfant vivant, non renonçant → il prend toute sa souche
      souches.push({
        rootChildId: childId,
        heritiers: [{ person: child, part: 1.0, representation: false }]
      });
      continue;
    }

    // Enfant décédé ou renonçant → représentation récursive par ses descendants
    const representants = collectRepresentantsRecursive(graph, childId);
    if (representants.length > 0) {
      souches.push({
        rootChildId: childId,
        heritiers: representants.map(r => ({
          person: r.person,
          part: r.part,
          representation: true
        }))
      });
    }
    // Si aucun représentant, la souche disparaît : sa part est répartie par
    // accroissement entre les autres souches (distributeToSouches divise
    // toujours par le nombre de souches réellement présentes).

    if (renonceACetteSuccession && result) {
      const decedentName = decedent ? `${decedent.prenom} ${decedent.nom}`.trim() : 'le défunt';
      result.explicationsTexte.push(
        representants.length > 0
          ? `${child.prenom} ${child.nom} renonce à la succession de ${decedentName} ; ses descendants viennent en représentation.`
          : `${child.prenom} ${child.nom} renonce à la succession de ${decedentName}, sans descendance ; sa part est réattribuée par accroissement (aux autres souches d'enfants, ou à l'ordre héréditaire suivant en l'absence d'autre enfant).`
      );
    }
  }

  return souches;
}

/**
 * Collecte récursivement les représentants vivants d'une personne décédée.
 * Chaque niveau de descendants se partage la part à égalité.
 */
function collectRepresentantsRecursive(
  graph: FamilyGraph,
  deceasedId: PersonId
): Array<{ person: any; part: number }> {
  const directChildren = graph.links
    .filter(link => link.from === deceasedId && link.relation === 'child')
    .map(link => graph.persons.find(p => p.id === link.to))
    .filter(Boolean);

  if (directChildren.length === 0) return [];

  const results: Array<{ person: any; part: number }> = [];
  const partPerChild = 1.0 / directChildren.length;

  for (const child of directChildren) {
    if (!child!.estDecede) {
      results.push({ person: child, part: partPerChild });
    } else {
      // Récursion : les descendants de cet enfant décédé le représentent
      const subRepresentants = collectRepresentantsRecursive(graph, child!.id);
      if (subRepresentants.length > 0) {
        subRepresentants.forEach(r => {
          results.push({ person: r.person, part: partPerChild * r.part });
        });
      }
      // Si pas de sous-représentants, cette branche meurt
    }
  }

  return results;
}

/**
 * Distribue une fraction de la succession aux souches d'enfants.
 */
function distributeToSouches(
  result: SuccessionLegaleResult,
  souches: Souche[],
  totalShare: number
): void {
  const partParSouche = totalShare / souches.length;

  for (const souche of souches) {
    const nbRepresentants = souche.heritiers.length;
    for (const h of souche.heritiers) {
      result.heritiers.push({
        personId: h.person.id,
        nom: h.person.nom,
        prenom: h.person.prenom || '',
        lien: h.representation ? 'petit_enfant' : 'enfant',
        quotePart: partParSouche * h.part,
        typeQuotePart: 'pleine_propriete',
        ordre: 1,
        representation: h.representation,
        representationRootId: h.representation ? souche.rootChildId : undefined,
        representationCount: h.representation ? nbRepresentants : undefined
      });
    }
  }
}

function distributeToSouchesWithType(
  result: SuccessionLegaleResult,
  souches: Souche[],
  totalShare: number,
  typeQuotePart: 'pleine_propriete' | 'usufruit' | 'nue_propriete'
): void {
  const partParSouche = totalShare / souches.length;

  for (const souche of souches) {
    const nbRepresentants = souche.heritiers.length;
    for (const h of souche.heritiers) {
      result.heritiers.push({
        personId: h.person.id,
        nom: h.person.nom,
        prenom: h.person.prenom || '',
        lien: h.representation ? 'petit_enfant' : 'enfant',
        quotePart: partParSouche * h.part,
        typeQuotePart,
        ordre: 1,
        representation: h.representation,
        representationRootId: h.representation ? souche.rootChildId : undefined,
        representationCount: h.representation ? nbRepresentants : undefined
      });
    }
  }
}

// ─── Fratrie avec représentation ────────────────────────────────────

interface SoucheFratrie {
  rootSiblingId: PersonId;
  heritiers: Array<{ person: any; part: number; representation: boolean }>;
}

function buildSouchesFratrie(graph: FamilyGraph, personnesVivantes: any[]): SoucheFratrie[] {
  const allSiblings = graph.persons.filter(p => {
    if (p.id === graph.decedentId) return false;
    const lien = p.lienFamilial?.toLowerCase();
    return lien === 'frère' || lien === 'sœur' || lien === 'frère/sœur' || lien === 'frere_soeur';
  });

  // Also check links for siblings
  const siblingIdsFromLinks = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'sibling')
    .map(link => link.to);

  const allSiblingIds = new Set([
    ...allSiblings.map(s => s.id),
    ...siblingIdsFromLinks
  ]);

  const souches: SoucheFratrie[] = [];

  for (const sibId of allSiblingIds) {
    const sibling = graph.persons.find(p => p.id === sibId);
    if (!sibling) continue;

    if (!sibling.estDecede) {
      souches.push({
        rootSiblingId: sibId,
        heritiers: [{ person: sibling, part: 1.0, representation: false }]
      });
    } else {
      // Frère/sœur décédé → représenté par ses enfants (neveux/nièces)
      const representants = collectRepresentantsRecursive(graph, sibId);
      if (representants.length > 0) {
        souches.push({
          rootSiblingId: sibId,
          heritiers: representants.map(r => ({
            person: r.person, part: r.part, representation: true
          }))
        });
      }
    }
  }

  return souches;
}

/**
 * Part de chaque souche de la fratrie (art. 752 C. civ.) : à parts égales si
 * tous sont du même lit ; sinon division par moitié entre ligne paternelle et
 * ligne maternelle, les germains prenant dans les deux, les consanguins
 * (même père) et utérins (même mère) dans la leur seulement. Une ligne sans
 * frère ni sœur laisse sa moitié à l'autre (art. 752 al. 2 — à l'exclusion
 * des autres parents de cette ligne). Lit non renseigné = germain.
 */
function partsFratrieParLignes(graph: FamilyGraph, souches: SoucheFratrie[]): number[] {
  const lit = (s: SoucheFratrie) => graph.persons.find(p => p.id === s.rootSiblingId)?.lienFratrie || 'germain';
  const lits = souches.map(lit);
  if (lits.every(l => l === 'germain')) return souches.map(() => 1 / souches.length);
  const paternels = lits.filter(l => l !== 'uterin').length;
  const maternels = lits.filter(l => l !== 'consanguin').length;
  const moitiePaternelle = maternels === 0 ? 1 : paternels === 0 ? 0 : 0.5;
  const moitieMaternelle = 1 - moitiePaternelle;
  return lits.map(l =>
    (l !== 'uterin' && paternels > 0 ? moitiePaternelle / paternels : 0) +
    (l !== 'consanguin' && maternels > 0 ? moitieMaternelle / maternels : 0)
  );
}

function distributeToSouchesFratrie(
  graph: FamilyGraph,
  result: SuccessionLegaleResult,
  souches: SoucheFratrie[],
  totalShare: number
): void {
  const parts = partsFratrieParLignes(graph, souches);
  if (parts.some(p => Math.abs(p - 1 / souches.length) > 1e-9)) {
    result.explicationsTexte.push(
      `Frères et sœurs de lits différents : la part de la fratrie est divisée par moitié entre les ` +
      `lignes paternelle et maternelle ; les germains prennent dans les deux, les demi-frères et ` +
      `demi-sœurs dans leur ligne seulement (C. civ. art. 752).`
    );
  }

  souches.forEach((souche, i) => {
    const partParSouche = totalShare * parts[i];
    const nbRepresentants = souche.heritiers.length;
    for (const h of souche.heritiers) {
      result.heritiers.push({
        personId: h.person.id,
        nom: h.person.nom,
        prenom: h.person.prenom || '',
        lien: h.representation ? 'neveu_niece' : 'frere_soeur',
        quotePart: partParSouche * h.part,
        typeQuotePart: 'pleine_propriete',
        ordre: 2,
        representation: h.representation,
        representationRootId: h.representation ? souche.rootSiblingId : undefined,
        representationCount: h.representation ? nbRepresentants : undefined
      });
    }
  });
}

// ─── Ascendants et collatéraux ordinaires (B5, ordres 3 et 4) ────────

type Ligne = 'paternelle' | 'maternelle';

/**
 * Défunt sans conjoint successible, descendant, parent ni frère ou sœur :
 * - 3e ordre, ascendants ordinaires (art. 747-748) : moitié par ligne, le
 *   plus proche en degré dans chaque ligne ; une ligne sans ascendant laisse
 *   sa moitié aux ascendants de l'autre ;
 * - 4e ordre, collatéraux ordinaires (art. 749-750), seulement à défaut de
 *   tout ascendant : même partage par lignes, même report d'une ligne vide ;
 * - personne : déshérence.
 */
function applyFenteSuccessorale(
  result: SuccessionLegaleResult,
  personnesVivantes: Person[],
  totalShare: number
): void {
  const ascendants = { paternelle: ascendantsLigne(personnesVivantes, 'paternelle'), maternelle: ascendantsLigne(personnesVivantes, 'maternelle') };
  const collateraux = { paternelle: collaterauxLigne(personnesVivantes, 'paternelle'), maternelle: collaterauxLigne(personnesVivantes, 'maternelle') };
  const parOrdre = ascendants.paternelle.length + ascendants.maternelle.length > 0
    ? { lignes: ascendants, libelle: 'ascendants', articles: 'art. 747-748' }
    : collateraux.paternelle.length + collateraux.maternelle.length > 0
      ? { lignes: collateraux, libelle: 'collatéraux', articles: 'art. 749-750' }
      : null;

  if (!parOrdre) {
    result.explicationsTexte.push(`Aucun héritier jusqu'au 6ème degré. L'État français hérite.`);
    return;
  }

  const { paternelle, maternelle } = parOrdre.lignes;
  if (paternelle.length > 0 && maternelle.length > 0) {
    distributeFenteHeritiers(result, paternelle, totalShare / 2);
    distributeFenteHeritiers(result, maternelle, totalShare / 2);
    result.explicationsTexte.push(
      `Fente successorale entre les ${parOrdre.libelle} : 50 % branche paternelle, 50 % branche maternelle (C. civ. ${parOrdre.articles}).`
    );
  } else {
    const ligne: Ligne = paternelle.length > 0 ? 'paternelle' : 'maternelle';
    distributeFenteHeritiers(result, parOrdre.lignes[ligne], totalShare);
    result.explicationsTexte.push(
      `Aucun ${parOrdre.libelle === 'ascendants' ? 'ascendant' : 'collatéral'} dans l'autre branche : la branche ${ligne} hérite de tout (C. civ. ${parOrdre.articles}).`
    );
  }
}

const estDeLaLigne = (p: Person, ligne: Ligne): boolean => {
  const b = p.brancheFamiliale?.toLowerCase() || '';
  const labels = ligne === 'paternelle' ? ['paternelle', 'paternel', 'père'] : ['maternelle', 'maternel', 'mère'];
  return labels.some(label => b.includes(label));
};
const estGrandParent = (p: Person) => {
  const lien = p.lienFamilial?.toLowerCase() || '';
  return !estArriereGrandParent(p) && (lien.includes('grand-parent') || lien.includes('grand_parent') || lien === 'grand-père' || lien === 'grand-mère');
};
const estArriereGrandParent = (p: Person) => {
  const lien = p.lienFamilial?.toLowerCase() || '';
  return lien.includes('arriere-grand') || lien.includes('arrière-grand') || lien.includes('arriere_grand') || lien.includes('arrière grand');
};

/** Ascendants ordinaires d'une ligne au degré le plus proche (grands-parents, à défaut arrière-grands-parents). */
function ascendantsLigne(personnesVivantes: Person[], ligne: Ligne): Person[] {
  const gp = personnesVivantes.filter(p => estGrandParent(p) && estDeLaLigne(p, ligne));
  if (gp.length > 0) return gp;
  return personnesVivantes.filter(p => estArriereGrandParent(p) && estDeLaLigne(p, ligne));
}

/**
 * Collatéraux ordinaires d'une ligne au degré le plus proche (oncles et
 * tantes, 3e degré, à défaut cousins germains, 4e). Le formulaire famille
 * enregistre 'Oncle/Tante' et 'Cousin/Cousine', d'où includes().
 */
function collaterauxLigne(personnesVivantes: Person[], ligne: Ligne): Person[] {
  const lien = (p: Person) => p.lienFamilial?.toLowerCase() || '';
  const oncles = personnesVivantes.filter(p => (lien(p).includes('oncle') || lien(p).includes('tante')) && estDeLaLigne(p, ligne));
  if (oncles.length > 0) return oncles;
  return personnesVivantes.filter(p => lien(p).includes('cousin') && estDeLaLigne(p, ligne));
}

/**
 * Ascendants les plus proches de la ligne opposée à celle du parent
 * survivant (art. 738-1). La ligne du parent se déduit de son libellé
 * (père/mère) ou des grands-parents rattachés à lui (enfant_de) ; à défaut,
 * de ceux rattachés à l'autre parent. Jamais devinée : si des ascendants
 * existent sans qu'on puisse situer la ligne du parent, le calcul s'arrête.
 */
function getAscendantsAutreLigne(graph: FamilyGraph, personnesVivantes: Person[], parent: Person): Person[] {
  const candidats = [...ascendantsLigne(personnesVivantes, 'paternelle'), ...ascendantsLigne(personnesVivantes, 'maternelle')];
  if (candidats.length === 0) return [];

  const ligneDe = (p: Person): Ligne | undefined =>
    estDeLaLigne(p, 'paternelle') ? 'paternelle' : estDeLaLigne(p, 'maternelle') ? 'maternelle' : undefined;
  const lienParent = parent.lienFamilial?.toLowerCase() || '';
  const grandsParentsRattaches = (parentId: string) =>
    graph.persons.filter(p => estGrandParent(p) && p.enfantDe === parentId).map(ligneDe).find(Boolean);
  // L'autre parent du défunt (vivant ou non) : même rattachement (enfant_de).
  const autresParents = graph.persons.filter(p => {
    const lien = p.lienFamilial?.toLowerCase();
    return p.id !== parent.id && p.enfantDe === parent.enfantDe && (lien === 'parent' || lien === 'père' || lien === 'mère');
  });
  const ligneAutreParent = autresParents.map(p => grandsParentsRattaches(p.id)).find(Boolean);

  const ligneParent: Ligne | undefined = lienParent === 'père' ? 'paternelle'
    : lienParent === 'mère' ? 'maternelle'
    : grandsParentsRattaches(parent.id)
      ?? (ligneAutreParent ? (ligneAutreParent === 'paternelle' ? 'maternelle' : 'paternelle') : undefined);

  if (!ligneParent) {
    throw new Error(
      `Impossible de situer la branche du parent survivant (${`${parent.prenom || ''} ${parent.nom || ''}`.trim()}) : ` +
      `rattachez dans Famille au moins un grand-parent à son enfant (champ « Enfant de »). Seuls les ascendants ` +
      `de l'autre branche partagent la succession avec lui (C. civ. art. 738-1).`
    );
  }
  return ascendantsLigne(personnesVivantes, ligneParent === 'paternelle' ? 'maternelle' : 'paternelle');
}

function distributeFenteHeritiers(
  result: SuccessionLegaleResult,
  heritiers: any[],
  totalShare: number
): void {
  const part = totalShare / heritiers.length;
  heritiers.forEach(h => {
    const lien = h.lienFamilial?.toLowerCase() || 'autre';
    result.heritiers.push({
      personId: h.id,
      nom: h.nom,
      prenom: h.prenom || '',
      lien: mapLienFamilial(lien),
      quotePart: part,
      typeQuotePart: 'pleine_propriete',
      ordre: lien.includes('grand') ? 3 : 4
    });
  });
}

// ─── Utilitaires ────────────────────────────────────────────────────

function getParentsVivants(_graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase();
    return lien === 'parent' || lien === 'père' || lien === 'mère';
  });
}

function findAllLivingDescendants(graph: FamilyGraph, ancestorId: PersonId): any[] {
  const results: any[] = [];
  const childLinks = graph.links.filter(l => l.from === ancestorId && l.relation === 'child');

  for (const link of childLinks) {
    const child = graph.persons.find(p => p.id === link.to);
    if (!child) continue;

    // Un enfant renonçant à la succession du défunt (cf. buildSouchesEnfants)
    // ne doit pas être pris par ce filet de sécurité : sans ce test, un
    // enfant vivant mais renonçant serait à tort compté comme héritier
    // direct, en contradiction avec la renonciation déjà actée plus haut.
    const renonceACetteSuccession = !!child.renoncant && child.renoncantDe === graph.decedentId;

    if (!child.estDecede && !renonceACetteSuccession) {
      results.push(child);
    } else {
      results.push(...findAllLivingDescendants(graph, child.id));
    }
  }

  return results;
}

function mapLienFamilial(lien: string): string {
  if (lien.includes('grand-parent') || lien.includes('grand_parent') || lien === 'grand-père' || lien === 'grand-mère') return 'grand_parent';
  if (lien.includes('arriere-grand') || lien.includes('arrière-grand')) return 'arriere_grand_parent';
  // Même remarque que dans collaterauxLigne : la valeur réelle du
  // formulaire est 'Oncle/Tante' / 'Cousin/Cousine' (jamais isolée).
  if (lien.includes('oncle') || lien.includes('tante')) return 'oncle_tante';
  if (lien.includes('cousin')) return 'cousin';
  return 'autre';
}
