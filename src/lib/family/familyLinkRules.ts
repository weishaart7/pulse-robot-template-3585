import { ageEnAnnees } from '@/lib/family/age';

// Règles d'affichage et d'enregistrement des champs d'un membre de la famille
// selon son lien familial. Partagées par DynamicFamilyForm.tsx (champs affichés)
// et FamilyMemberFormDialog.tsx (champs enregistrés), pour qu'un champ masqué
// ne soit jamais enregistré avec une valeur saisie pour un autre type de lien.

// Branche familiale (paternelle / maternelle) requise : sans elle,
// successionLegale.ts exclut le membre de la fente.
export const LINKS_WITH_BRANCHE = ['Oncle/Tante', 'Grand-parent', 'Cousin/Cousine', 'Arrière grand-parent'];

// Champ de rattachement (enfant_de) affiché.
export const LINKS_WITH_PARENT = [
  'Enfant', 'Parent', 'Frère/Sœur', 'Oncle/Tante', 'Petit-enfant', 'Arrière petit-enfant',
  'Grand-parent', 'Arrière grand-parent', 'Neveu/Nièce', 'Petit neveu/nièce', 'Cousin/Cousine',
];

export const LINKS_WITH_ADOPTION = ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'];

// Renonciation et enfant à charge (civil / fiscal) : Enfant uniquement.
export const LINKS_WITH_CHILD_FIELDS = ['Enfant'];

export const LINKS_WITH_EXONERATION = ['Frère/Sœur'];

// Exonération des frères et sœurs (art. 796-0 ter CGI) : les trois conditions
// sont cumulatives et s'apprécient au jour du décès, simulé ici à la date du jour.
//  1. célibataire, veuf, divorcé ou séparé de corps ;
//  2. plus de 50 ans, ou infirmité empêchant de subvenir à ses besoins ;
//  3. domicilié avec le défunt de façon continue pendant les 5 ans précédents.
// « Plus de 50 ans » est lu comme 50 ans révolus (ageEnAnnees >= 50).
export const AGE_MIN_EXONERATION_FRERE_SOEUR = 50;

export interface ConditionsExonerationFrereSoeur {
  seul?: boolean;
  infirmite?: boolean;
  cohabitation5Ans?: boolean;
  dateNaissance?: Date | string | null;
}

export interface ResultatExonerationFrereSoeur {
  exonere: boolean;
  conditionsManquantes: string[];
}

export function evaluerExonerationFrereSoeur(
  c: ConditionsExonerationFrereSoeur,
  today: Date = new Date()
): ResultatExonerationFrereSoeur {
  const manquantes: string[] = [];
  if (!c.seul) manquantes.push('célibataire, veuf(ve), divorcé(e) ou séparé(e) de corps');

  if (!c.infirmite) {
    if (!c.dateNaissance) {
      manquantes.push('plus de 50 ans (date de naissance non renseignée) ou infirmité');
    } else if (ageEnAnnees(c.dateNaissance, today) < AGE_MIN_EXONERATION_FRERE_SOEUR) {
      manquantes.push('plus de 50 ans ou infirmité');
    }
  }

  if (!c.cohabitation5Ans) manquantes.push('domicilié avec vous depuis au moins 5 ans');

  return { exonere: manquantes.length === 0, conditionsManquantes: manquantes };
}

interface SanitizableMember {
  lien_familial?: string;
  est_decede?: boolean;
  enfant_de?: string | null;
  branche_familiale?: string | null;
  enfant_adopte?: string | null;
  adoption_simple_abattement_plein?: boolean;
  adoption_simple_motif?: string | null;
  enfant_renoncant?: boolean;
  enfant_renoncant_de?: string | null;
  enfant_a_charge?: boolean;
  fiscalement_a_charge?: boolean;
  exoneration_succession?: boolean;
  exo_frere_soeur_seul?: boolean;
  exo_frere_soeur_infirmite?: boolean;
  exo_frere_soeur_cohabitation_5_ans?: boolean;
  date_deces?: Date;
}

// Remet à zéro les champs sans objet pour le lien choisi (ex. « Renonçant »
// coché puis lien changé d'Enfant à Parent) et ceux devenus sans objet par
// l'état des cases (adoption non simple, non renonçant, non décédé).
export function sanitizeMemberForLink<T extends SanitizableMember>(data: T): T {
  const lien = data.lien_familial ?? '';
  const out: T = { ...data };

  if (!LINKS_WITH_PARENT.includes(lien)) out.enfant_de = null;
  if (!LINKS_WITH_BRANCHE.includes(lien)) out.branche_familiale = null;

  const adoptionApplies = LINKS_WITH_ADOPTION.includes(lien);
  if (!adoptionApplies) out.enfant_adopte = 'Non';
  if (!adoptionApplies || out.enfant_adopte !== 'Adoption simple') {
    out.adoption_simple_abattement_plein = false;
  }
  if (!out.adoption_simple_abattement_plein) out.adoption_simple_motif = null;

  if (!LINKS_WITH_CHILD_FIELDS.includes(lien)) {
    out.enfant_renoncant = false;
    out.enfant_a_charge = false;
    out.fiscalement_a_charge = false;
  }
  if (!out.enfant_renoncant) out.enfant_renoncant_de = null;

  if (!LINKS_WITH_EXONERATION.includes(lien)) {
    out.exoneration_succession = false;
    out.exo_frere_soeur_seul = false;
    out.exo_frere_soeur_infirmite = false;
    out.exo_frere_soeur_cohabitation_5_ans = false;
  }
  if (!out.est_decede) out.date_deces = undefined;

  return out;
}

// ── Cohérence de l'ascendance (R1-R5) ────────────────────────────────────────
// R1-R4 : au plus deux parents par personne. Un Parent est rattaché au client
// ('user') ou au conjoint ('spouse'), un Grand-parent à un Parent, un Arrière
// grand-parent à un Grand-parent (enfant_de porte la personne dont il est le parent).
// R5 : un ascendant naît strictement avant la personne dont il est le parent.

export const MAX_PARENTS_PAR_PERSONNE = 2;
export const LINKS_ASCENDANTS = ['Parent', 'Grand-parent', 'Arrière grand-parent'];
// Descendants dont enfant_de désigne un de leurs parents.
export const LINKS_DESCENDANTS = ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'];

interface LienPourCoherence {
  id?: string;
  lien_familial: string;
  enfant_de?: string | null;
  date_naissance?: string | Date | null;
}

export interface ContexteCoherence {
  editingId?: string | null;
  dateNaissanceClient?: string | null;
  dateNaissanceConjoint?: string | null;
}

export interface ErreurCoherence {
  path: 'enfant_de' | 'date_naissance';
  message: string;
}

const toIso = (d?: string | Date | null): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
};

// Valeurs enfant_de déjà « pleines » (deux parents saisis) pour un lien
// ascendant, en excluant le membre en cours de modification.
export function rattachementsComplets(
  lien: string,
  links: LienPourCoherence[],
  editingId?: string | null
): Set<string> {
  const complets = new Set<string>();
  if (!LINKS_ASCENDANTS.includes(lien)) return complets;
  const compte: Record<string, number> = {};
  links.forEach(l => {
    if (l.lien_familial !== lien || !l.enfant_de || (editingId && l.id === editingId)) return;
    compte[l.enfant_de] = (compte[l.enfant_de] ?? 0) + 1;
    if (compte[l.enfant_de] >= MAX_PARENTS_PAR_PERSONNE) complets.add(l.enfant_de);
  });
  return complets;
}

export function verifierCoherenceAscendance(
  membre: LienPourCoherence,
  links: LienPourCoherence[],
  ctx: ContexteCoherence = {}
): ErreurCoherence[] {
  const erreurs: ErreurCoherence[] = [];
  const lien = membre.lien_familial;
  const autres = links.filter(l => !(ctx.editingId && l.id === ctx.editingId));
  const naissance = toIso(membre.date_naissance);

  if (membre.enfant_de && rattachementsComplets(lien, links, ctx.editingId).has(membre.enfant_de)) {
    erreurs.push({ path: 'enfant_de', message: 'Cette personne a déjà deux parents renseignés' });
  }

  if (!naissance) return erreurs;

  // Dates de naissance des personnes désignées par enfant_de.
  const datesRattachement = (enfantDe?: string | null): { nom: string; date: string | null }[] => {
    if (!enfantDe) return [];
    const client = { nom: 'le client', date: toIso(ctx.dateNaissanceClient) };
    const conjoint = { nom: 'le conjoint', date: toIso(ctx.dateNaissanceConjoint) };
    if (enfantDe === 'user') return [client];
    if (enfantDe === 'spouse') return [conjoint];
    if (enfantDe === 'both_parents') return [client, conjoint];
    const l = autres.find(x => x.id === enfantDe);
    return l ? [{ nom: 'la personne de rattachement', date: toIso(l.date_naissance) }] : [];
  };

  const estAscendant = LINKS_ASCENDANTS.includes(lien);
  const estDescendant = LINKS_DESCENDANTS.includes(lien);

  // Le membre face à la personne à laquelle il est rattaché.
  if (estAscendant || estDescendant) {
    for (const r of datesRattachement(membre.enfant_de)) {
      if (!r.date) continue;
      if (estAscendant && naissance >= r.date) {
        erreurs.push({ path: 'date_naissance', message: `Un parent doit être né avant ${r.nom}` });
      }
      if (estDescendant && naissance <= r.date) {
        erreurs.push({ path: 'date_naissance', message: `Un enfant doit être né après ${r.nom}` });
      }
    }
  }

  // Le membre modifié face aux membres qui lui sont rattachés.
  if (ctx.editingId) {
    autres
      .filter(l => l.enfant_de === ctx.editingId)
      .forEach(l => {
        const d = toIso(l.date_naissance);
        if (!d) return;
        // Ses propres parents (ex. Grand-parent rattaché à ce Parent).
        if (estAscendant && LINKS_ASCENDANTS.includes(l.lien_familial) && naissance <= d) {
          erreurs.push({ path: 'date_naissance', message: 'Doit être né après ses propres parents renseignés' });
        }
        // Ses enfants (ex. Petit-enfant rattaché à cet Enfant).
        if (estDescendant && LINKS_DESCENDANTS.includes(l.lien_familial) && naissance >= d) {
          erreurs.push({ path: 'date_naissance', message: 'Doit être né avant ses enfants renseignés' });
        }
      });
  }

  // Dédoublonnage (both_parents peut produire deux fois le même message).
  return erreurs.filter((e, i) => erreurs.findIndex(x => x.path === e.path && x.message === e.message) === i);
}
