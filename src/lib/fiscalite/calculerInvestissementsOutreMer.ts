import { ReductionsCreditsImpotInput } from './types';
import { ajouterJumelles2027 } from './cases2027';

/**
 * Investissements outre-mer (2042-IOM, revenus 2025/impôt 2026). Le montant saisi est déjà la
 * réduction (ou le crédit pour HJA). Règles relevées sur le simulateur officiel 2026, case par case
 * (1 000 €, 50 000 €, 100 000 €) et sur des cumuls :
 * - plafond propre : 40 000 €, 36 000 € ou 30 600 € selon l'année d'agrément ; 30 600 € ÷ 44 %
 *   (69 545 €) et ÷ 34 % (90 000 €) pour les investissements avec rétrocession de 56 % et 66 % ;
 *   aucun pour les régimes avant 2009, l'exploitation directe et le logement social ;
 * - cases à plafond « commun » : leur total est limité au plus bas des plafonds présents
 *   (HOB + HOI → 36 000 € ; HOB + HOT, HGU + HOZ → 30 600 €). Écart connu : HGU 20 000 € +
 *   HOB 30 000 € donne 40 000 € sur le simulateur, 30 600 € ici ;
 * - part retenue au plafonnement global (art. 200-0 A) : 100 %, 44 %, 34 %, 30 % ou 0 % ;
 * - HJA : crédit restituable, hors plafonds ; HQA, HKC, HLV : sans effet.
 */
export const PLAFOND_OUTRE_MER_RECENT = 30_600;

type Nature = 'reduction' | 'credit' | 'sans_effet';
interface RegleCase {
  nature: Nature;
  plafond: number | null;
  commun: boolean;
  part: number;
}
type CleOutreMer = Extract<keyof ReductionsCreditsImpotInput, `caseH${string}`>;

export const REGLES_OUTRE_MER: Partial<Record<CleOutreMer, RegleCase>> = {
  caseHqa: { nature: 'sans_effet', plafond: null, commun: false, part: 0.0 },
  caseHyj: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHye: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHyf: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHyg: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHyh: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHyi: { nature: 'reduction', plafond: null, commun: false, part: 0.3 },
  caseHoa: { nature: 'reduction', plafond: null, commun: false, part: 0.0 },
  caseHob: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHoc: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHoh: { nature: 'reduction', plafond: null, commun: false, part: 0.0 },
  caseHoi: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHoj: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHok: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHol: { nature: 'reduction', plafond: null, commun: false, part: 0.0 },
  caseHom: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHon: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHoo: { nature: 'reduction', plafond: null, commun: false, part: 0.0 },
  caseHop: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHoq: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHor: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHos: { nature: 'reduction', plafond: null, commun: false, part: 0.0 },
  caseHot: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHou: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHov: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHow: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHod: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHoe: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHof: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHog: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHox: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHoy: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHoz: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHua: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHub: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHuc: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHud: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHue: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHuf: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHug: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHuh: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHui: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHuj: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHuk: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHul: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHum: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHun: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHuo: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHup: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHuq: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHur: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHus: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHut: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHuu: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHkc: { nature: 'sans_effet', plafond: null, commun: false, part: 0.0 },
  caseHva: { nature: 'reduction', plafond: 40_000, commun: true, part: 0.0 },
  caseHvb: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHvc: { nature: 'reduction', plafond: 36_000, commun: true, part: 0.0 },
  caseHvd: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHve: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHvf: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 0.0 },
  caseHvg: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHvk: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHvl: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHvm: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHvn: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHvo: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHls: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHlt: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHlu: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHlv: { nature: 'sans_effet', plafond: null, commun: false, part: 0.0 },
  caseHlw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHgs: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHgt: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHgu: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHgw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHhs: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHht: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHhu: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHhw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHis: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHit: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHiu: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHiw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHjs: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHjt: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHju: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHjw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHks: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.44, commun: false, part: 0.44 },
  caseHkt: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT / 0.34, commun: false, part: 0.34 },
  caseHku: { nature: 'reduction', plafond: PLAFOND_OUTRE_MER_RECENT, commun: true, part: 1.0 },
  caseHkw: { nature: 'reduction', plafond: null, commun: false, part: 1.0 },
  caseHja: { nature: 'credit', plafond: null, commun: false, part: 0.0 },
};
// Cases de la déclaration 2027 : règle de la cohorte précédente (voir cases2027.ts).
ajouterJumelles2027(REGLES_OUTRE_MER as Partial<Record<string, RegleCase>>, r => ({ ...r }));

export interface InvestissementsOutreMerResult {
  /** Réductions retenues après plafonds propres (non restituables). */
  reductions: number;
  /** Crédit HJA (restituable). */
  credit: number;
  /** Montant compté au plafonnement global, parts appliquées. */
  avantagesPlafonnes: number;
}

export function calculerInvestissementsOutreMer(input: ReductionsCreditsImpotInput): InvestissementsOutreMerResult {
  let communSaisi = 0;
  let communPartSaisie = 0;
  let plafondCommun = Infinity;
  let reductionsHorsCommun = 0;
  let avantagesHorsCommun = 0;
  let credit = 0;
  for (const [cle, regle] of Object.entries(REGLES_OUTRE_MER) as [CleOutreMer, RegleCase][]) {
    const montant = Math.max(0, input[cle] ?? 0);
    if (montant === 0 || regle.nature === 'sans_effet') continue;
    if (regle.nature === 'credit') { credit += montant; continue; }
    if (regle.commun && regle.plafond !== null) {
      communSaisi += montant;
      communPartSaisie += montant * regle.part;
      plafondCommun = Math.min(plafondCommun, regle.plafond);
    } else {
      const retenu = regle.plafond === null ? montant : Math.min(montant, Math.round(regle.plafond));
      reductionsHorsCommun += retenu;
      avantagesHorsCommun += retenu * regle.part;
    }
  }
  const communRetenu = Math.min(communSaisi, plafondCommun);
  // Part au plafonnement global du total commun : au prorata des montants saisis.
  const avantagesCommun = communSaisi > 0 ? communPartSaisie * communRetenu / communSaisi : 0;
  return {
    reductions: reductionsHorsCommun + communRetenu,
    credit,
    avantagesPlafonnes: avantagesHorsCommun + avantagesCommun,
  };
}
