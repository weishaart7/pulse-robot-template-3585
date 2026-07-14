import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Worker pdf.js chargé depuis le bundle local (aucun appel réseau externe) —
// pattern d'import Vite recommandé pour pdfjs-dist.
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type TypeRegime = 'trimestres' | 'points';

export interface RegimeDetecte {
  nom: string;
  type: TypeRegime;
  trimestres?: number;
  points?: number;
  valeurPoint?: number;
  dateValeurPoint?: string;
}

export interface ParseRISResult {
  regimes: RegimeDetecte[];
  texteIllisible: boolean;
}

/**
 * Reconstruit le texte de la page ligne par ligne à partir des positions des
 * items pdf.js (regroupement par coordonnée Y), pour que les régimes du RIS
 * restent séparés par un saut de ligne — un simple `join(' ')` de tous les
 * items mélangerait les blocs et casserait le parsing par régime.
 */
function reconstruireLignes(items: TextItem[]): string[] {
  const lignesParY = new Map<number, string[]>();

  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!lignesParY.has(y)) lignesParY.set(y, []);
    lignesParY.get(y)!.push(item.str);
  }

  const yTriesDecroissant = Array.from(lignesParY.keys()).sort((a, b) => b - a);
  return yTriesDecroissant
    .map((y) => lignesParY.get(y)!.join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const RE_TRIMESTRES = /total des trimestres\s*:?\s*(\d+)/i;
const RE_POINTS = /total des points\s*:?\s*([\d\s]+)/i;
const RE_VALEUR_POINT = /valeur du point au\s*(\d{2}\/\d{2}\/\d{4})\s*:?\s*([\d,]+)\s*€/i;

/**
 * Heuristique pour reconnaître une ligne "nom de régime" : ligne courte,
 * qui ne commence pas par un chiffre et n'est pas elle-même une ligne de
 * métrique. Le format RIS ne fournit pas de balisage explicite pour le nom
 * du régime dans le texte extrait — c'est l'approximation la plus fiable
 * sans dépendre d'une liste figée de noms de régimes connus.
 */
function ressembleAUnNomDeRegime(ligne: string): boolean {
  if (ligne.length < 2 || ligne.length > 60) return false;
  if (/^\d/.test(ligne)) return false;
  if (RE_TRIMESTRES.test(ligne) || RE_POINTS.test(ligne) || RE_VALEUR_POINT.test(ligne)) return false;
  return true;
}

export function parseRegimesDepuisTexte(lignes: string[]): RegimeDetecte[] {
  const regimes: RegimeDetecte[] = [];
  let nomCourant: string | null = null;

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];

    const matchTrimestres = ligne.match(RE_TRIMESTRES);
    const matchPoints = ligne.match(RE_POINTS);

    if (matchTrimestres) {
      regimes.push({
        nom: nomCourant || 'Régime non identifié',
        type: 'trimestres',
        trimestres: parseInt(matchTrimestres[1], 10),
      });
      nomCourant = null;
      continue;
    }

    if (matchPoints) {
      let valeurPoint: number | undefined;
      let dateValeurPoint: string | undefined;

      // La ligne "Valeur du point" suit généralement de près la ligne
      // "Total des points" — on regarde quelques lignes en avant.
      for (let j = i; j < Math.min(i + 4, lignes.length); j++) {
        const matchValeur = lignes[j].match(RE_VALEUR_POINT);
        if (matchValeur) {
          dateValeurPoint = matchValeur[1];
          valeurPoint = parseFloat(matchValeur[2].replace(',', '.'));
          break;
        }
      }

      regimes.push({
        nom: nomCourant || 'Régime non identifié',
        type: 'points',
        points: parseInt(matchPoints[1].replace(/\s/g, ''), 10),
        valeurPoint,
        dateValeurPoint,
      });
      nomCourant = null;
      continue;
    }

    if (ressembleAUnNomDeRegime(ligne)) {
      nomCourant = ligne;
    }
  }

  return regimes;
}

/**
 * Extrait et parse la page 2 (page "Mes régimes") d'un RIS. Le fichier n'est
 * jamais stocké : il est lu en mémoire (ArrayBuffer) le temps de l'extraction
 * puis abandonné avec le reste de la fonction — aucun envoi réseau, aucune
 * écriture Supabase Storage.
 */
export async function parseRIS(file: File): Promise<ParseRISResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages < 2) {
    return { regimes: [], texteIllisible: true };
  }

  const page = await pdf.getPage(2);
  const textContent = await page.getTextContent();
  const items = textContent.items.filter((item): item is TextItem => 'str' in item);

  if (items.length === 0) {
    // Page sans texte extractible (scan image) : rien à parser.
    return { regimes: [], texteIllisible: true };
  }

  const lignes = reconstruireLignes(items);
  const regimes = parseRegimesDepuisTexte(lignes);

  return { regimes, texteIllisible: regimes.length === 0 };
}
