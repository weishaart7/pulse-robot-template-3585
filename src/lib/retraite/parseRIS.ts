import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
// Import `?url` : Vite résout ce fichier comme un asset statique et renvoie
// son URL finale (avec hash) dans le bundle de prod. Le pattern
// `new URL('pdfjs-dist/...', import.meta.url)` casse silencieusement en
// production (le worker ne se charge pas, pdf.js échoue plus loin avec une
// erreur cryptique sans rapport apparent) — voir mozilla/pdf.js#19519.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Worker pdf.js chargé depuis le bundle local (aucun appel réseau externe).
GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

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
  detailCarriere: PeriodeCarriere[];
  texteIllisible: boolean;
}

export type TypeActivite = 'employeur' | 'chomage' | 'maladie' | 'micro_entrepreneur';

export interface PeriodeCarriere {
  // Libellé de la ligne source (nom d'employeur, ou libellé de catégorie tel
  // que "MICRO-ENTREPRENEUR - Activité de vente BIC") — jamais null, y
  // compris pour les catégories non-employeur : c'est la seule information
  // qui distingue par exemple les 3 sous-types de micro-entrepreneur
  // (vente / prestation BNC / prestation BIC) qui apparaissent comme des
  // blocs distincts dans le RIS.
  employeur: string;
  typeActivite: TypeActivite;
  dateDebut: string; // ISO yyyy-mm-dd
  dateFin: string; // ISO yyyy-mm-dd
  revenu: number | null; // null = non renseigné dans le RIS, à distinguer d'un revenu nul
  estChiffreAffaires: boolean;
  regimes: string[];
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

// Étiquette seule ("Total des trimestres") — dans un vrai RIS en mise en page
// à colonnes, la valeur n'est pas forcément sur la même ligne que l'étiquette
// (le texte de la colonne voisine s'intercale dans l'ordre de lecture
// reconstruit par reconstruireLignes). RE_TRIMESTRES/RE_POINTS restent
// utilisées pour le cas où étiquette + valeur sont bien sur une seule ligne.
const RE_LIGNE_TRIMESTRES = /^total des trimestres\b/i;
const RE_LIGNE_POINTS = /^total des points\b/i;
const RE_TRIMESTRES = /total des trimestres\s*:?\s*(\d+)/i;
const RE_POINTS = /total des points\s*:?\s*([\d\s]+)/i;
const RE_VALEUR_POINT = /valeur du point au\s*(\d{2}\/\d{2}\/\d{4})\s*:?\s*([\d,]+)\s*€/i;
// Une ligne réduite à un seul nombre (ex: "28", "203,84").
const RE_VALEUR_SEULE = /^(\d+(?:[,.]\d+)?)$/;
// Une ligne "Libellé : nombre" en fin de ligne (ex: "Salarié, Indépendant : 28",
// "Complémentaire indépendant (RCI) : 9").
const RE_VALEUR_FIN_DE_LIGNE = /:\s*(\d+(?:[,.]\d+)?)\s*$/;
// Nom de régime parfois entre parenthèses dans le libellé de la valeur
// (ex: "(RCI)"), plus fiable que l'heuristique de titre quand présent.
const RE_NOM_ENTRE_PARENTHESES = /\(([^()]+)\)/;

function parseNombreFr(valeur: string): number {
  return parseFloat(valeur.replace(',', '.'));
}

/**
 * Heuristique pour reconnaître une ligne "nom de régime" : ligne courte,
 * qui ne commence pas par un chiffre et n'est pas elle-même une ligne de
 * métrique. Le format RIS ne fournit pas de balisage explicite pour le nom
 * du régime dans le texte extrait — c'est l'approximation la plus fiable
 * sans dépendre d'une liste figée de noms de régimes connus.
 *
 * Retourne le nom à utiliser (la ligne elle-même dans le cas général), ou
 * `null` si la ligne ne ressemble pas à un nom de régime.
 */
function ressembleAUnNomDeRegime(ligne: string): string | null {
  if (ligne.length < 2) return null;
  if (/^\d/.test(ligne)) return null;
  if (RE_LIGNE_TRIMESTRES.test(ligne) || RE_LIGNE_POINTS.test(ligne) || RE_VALEUR_POINT.test(ligne)) return null;
  // "Numéro d'identifiant : ..." précède chaque bloc régime dans un RIS réel
  // et ne doit pas être pris pour le nom du régime. Comparaison insensible
  // à la casse et aux accents (normalize + suppression des diacritiques).
  const ligneNormalisee = ligne.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/numero d.?identifiant/.test(ligneNormalisee)) return null;

  if (ligne.length > 60) {
    // Repli : une ligne trop longue pour être un nom de régime "standard"
    // (ex: nom complet "Caisse interprofessionnelle de prévoyance et
    // d'assurance vieillesse (CIPAV)", 75 caractères) peut quand même
    // contenir un sigle exploitable entre parenthèses — même regex que celui
    // déjà validé pour le format "Libellé : nombre" (RE_NOM_ENTRE_PARENTHESES).
    const matchParenthese = ligne.match(RE_NOM_ENTRE_PARENTHESES);
    return matchParenthese ? matchParenthese[1] : null;
  }

  return ligne;
}

/**
 * Cherche, à partir de `depart`, la valeur numérique associée à une étiquette
 * "Total des trimestres/points" quand elle n'est pas sur la même ligne —
 * soit une ligne réduite à un nombre, soit une ligne "Libellé : nombre".
 * S'arrête dès qu'un nouveau bloc métrique commence, pour ne pas capturer la
 * valeur d'un régime suivant.
 */
function chercherValeurEtNom(
  lignes: string[],
  depart: number,
  maxLookahead = 6
): { valeur: number; nomDepuisParenthese?: string } | null {
  for (let j = depart; j < Math.min(depart + maxLookahead, lignes.length); j++) {
    const ligne = lignes[j];
    if (j > depart && (RE_LIGNE_TRIMESTRES.test(ligne) || RE_LIGNE_POINTS.test(ligne))) break;

    const matchSeule = ligne.match(RE_VALEUR_SEULE);
    if (matchSeule) return { valeur: parseNombreFr(matchSeule[1]) };

    const matchFinDeLigne = ligne.match(RE_VALEUR_FIN_DE_LIGNE);
    if (matchFinDeLigne) {
      const matchParenthese = ligne.match(RE_NOM_ENTRE_PARENTHESES);
      return {
        valeur: parseNombreFr(matchFinDeLigne[1]),
        nomDepuisParenthese: matchParenthese?.[1],
      };
    }
  }
  return null;
}

export function parseRegimesDepuisTexte(lignes: string[]): RegimeDetecte[] {
  const regimes: RegimeDetecte[] = [];
  let nomCourant: string | null = null;

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];

    if (RE_LIGNE_TRIMESTRES.test(ligne)) {
      const matchMemeLigne = ligne.match(RE_TRIMESTRES);
      const trouve = matchMemeLigne
        ? { valeur: parseInt(matchMemeLigne[1], 10) }
        : chercherValeurEtNom(lignes, i + 1);

      if (trouve) {
        regimes.push({
          nom: trouve.nomDepuisParenthese || nomCourant || 'Régime non identifié',
          type: 'trimestres',
          trimestres: Math.round(trouve.valeur),
        });
        nomCourant = null;
      }
      continue;
    }

    if (RE_LIGNE_POINTS.test(ligne)) {
      const matchMemeLigne = ligne.match(RE_POINTS);
      const trouve = matchMemeLigne
        ? { valeur: parseNombreFr(matchMemeLigne[1].replace(/\s/g, '')) }
        : chercherValeurEtNom(lignes, i + 1);

      if (trouve) {
        let valeurPoint: number | undefined;
        let dateValeurPoint: string | undefined;

        // La ligne "Valeur du point" suit généralement de près la ligne
        // "Total des points" — on regarde quelques lignes en avant.
        for (let j = i; j < Math.min(i + 8, lignes.length); j++) {
          const matchValeur = lignes[j].match(RE_VALEUR_POINT);
          if (matchValeur) {
            dateValeurPoint = matchValeur[1];
            valeurPoint = parseNombreFr(matchValeur[2]);
            break;
          }
        }

        regimes.push({
          nom: trouve.nomDepuisParenthese || nomCourant || 'Régime non identifié',
          type: 'points',
          points: trouve.valeur,
          valeurPoint,
          dateValeurPoint,
        });
        nomCourant = null;
      }
      continue;
    }

    const nomReconnu = ressembleAUnNomDeRegime(ligne);
    if (nomReconnu) {
      nomCourant = nomReconnu;
    }
  }

  return regimes;
}

// --- Détail de carrière ("Détail de votre carrière") ------------------------
//
// Contrairement à la page "Mes régimes", chaque période occupe DEUX lignes Y
// distinctes reconstruites par reconstruireLignes : une ligne "nom" (employeur
// ou catégorie, ex: "TITANE MOTOR") suivie d'une ligne "données" (dates,
// revenu, régime(s)), et non une seule ligne combinée comme on l'imaginait
// avant vérification sur un relevé réel. Une ligne de continuation est une
// ligne "données" supplémentaire sans nouvelle ligne "nom" avant elle (pas un
// champ nom vide sur la même ligne).

const RE_TITRE_DETAIL_CARRIERE = /détail de votre carrière/i;
const RE_LIGNE_ENTETE_COLONNES_CARRIERE = /^Employeur\/activit/i;
// Notes de bas de page ("*Revenu d'activité...", "(1) Pour votre activité...")
const RE_LIGNE_NOTE_BAS_DE_PAGE = /^(\*|\(1\))/;
// Bandeau bas de page ("Edité le dd/mm/yyyy n / n") — contient une date, donc
// doit être exclu explicitement avant tout test de présence de date sur la
// page (sinon la tolérance multi-page ci-dessous ne s'arrêterait jamais).
const RE_LIGNE_PIED_DE_PAGE = /^[EÉ]dit[ée] le \d{2}\/\d{2}\/\d{4}/i;
const RE_LIGNE_CODE_DOCUMENT = /^DAICRISE/i;
const RE_LIGNE_ENTETE_PAGE = /^Relevé de carrière/i;

// Ligne "données" : deux dates en tête, puis optionnellement un revenu
// ("6 585 €", parfois suivi du repère "(1)" pour un chiffre d'affaires
// micro-entrepreneur), puis le reste de la ligne = régime(s) (vide sur
// certaines lignes de continuation).
const RE_LIGNE_DONNEES_CARRIERE =
  /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*((?:\d[\d\u00a0\u202f ]*€\s*(?:\(1\))?))?\s*(.*)$/;

function estLigneChromeOuIgnorable(ligne: string): boolean {
  return (
    RE_TITRE_DETAIL_CARRIERE.test(ligne) ||
    RE_LIGNE_ENTETE_COLONNES_CARRIERE.test(ligne) ||
    RE_LIGNE_NOTE_BAS_DE_PAGE.test(ligne) ||
    RE_LIGNE_PIED_DE_PAGE.test(ligne) ||
    RE_LIGNE_CODE_DOCUMENT.test(ligne) ||
    RE_LIGNE_ENTETE_PAGE.test(ligne)
  );
}

function classifierTypeActivite(nomLigne: string): TypeActivite {
  const normalise = nomLigne
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (normalise.includes('CHOMAGE')) return 'chomage';
  if (normalise.includes('MALADIE')) return 'maladie';
  if (normalise.includes('MICRO-ENTREPRENEUR') || normalise.includes('MICRO ENTREPRENEUR')) {
    return 'micro_entrepreneur';
  }
  return 'employeur';
}

function convertirDateFrEnIso(dateFr: string): string {
  const [jour, mois, annee] = dateFr.split('/');
  return `${annee}-${mois}-${jour}`;
}

function parserRevenu(revenuBrut: string | undefined): { revenu: number | null; estChiffreAffaires: boolean } {
  if (!revenuBrut) return { revenu: null, estChiffreAffaires: false };
  const estChiffreAffaires = /\(1\)/.test(revenuBrut);
  // Retirer le repère "(1)" avant le nettoyage générique : son chiffre "1"
  // serait sinon confondu avec un chiffre du montant (ex: "2 922 € (1)" ne
  // doit pas devenir "29221").
  const chiffres = revenuBrut.replace(/\(1\)/, '').replace(/[^\d,]/g, '');
  return { revenu: chiffres ? parseFloat(chiffres.replace(',', '.')) : null, estChiffreAffaires };
}

/**
 * Parse les lignes déjà reconstruites (potentiellement concaténées depuis
 * plusieurs pages, voir extraireDetailCarriere) du tableau "Détail de votre
 * carrière" en périodes de carrière.
 */
export function parseDetailCarriereDepuisTexte(lignes: string[]): PeriodeCarriere[] {
  const periodes: PeriodeCarriere[] = [];
  let nomCourant: string | null = null;
  let typeActiviteCourant: TypeActivite = 'employeur';
  let regimesCourants: string[] = [];

  for (const ligneBrute of lignes) {
    const ligne = ligneBrute.trim();
    if (!ligne || estLigneChromeOuIgnorable(ligne)) continue;

    const matchDonnees = ligne.match(RE_LIGNE_DONNEES_CARRIERE);
    if (matchDonnees) {
      // Ligne de données sans bloc employeur/activité ouvert au préalable :
      // ne devrait pas arriver avec un RIS conforme au format observé, on
      // l'ignore plutôt que de deviner un employeur.
      if (nomCourant === null) continue;

      const [, dateDebutBrute, dateFinBrute, revenuBrut, regimeBrut] = matchDonnees;
      const regimeTexte = regimeBrut.trim();
      if (regimeTexte) {
        regimesCourants = regimeTexte
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
      }
      // Sinon (ligne de continuation sans régime) : on garde regimesCourants
      // hérité du dernier bloc.

      const { revenu, estChiffreAffaires } = parserRevenu(revenuBrut);

      periodes.push({
        employeur: nomCourant,
        typeActivite: typeActiviteCourant,
        dateDebut: convertirDateFrEnIso(dateDebutBrute),
        dateFin: convertirDateFrEnIso(dateFinBrute),
        revenu,
        estChiffreAffaires,
        regimes: regimesCourants,
      });
      continue;
    }

    // Ligne "nom" : ouverture d'un nouveau bloc employeur/activité.
    nomCourant = ligne;
    typeActiviteCourant = classifierTypeActivite(ligne);
    regimesCourants = [];
  }

  return periodes;
}

/**
 * Localise la (ou les) page(s) "Détail de votre carrière" par recherche de
 * titre — pas par index fixe — puis reconstruit et concatène leurs lignes.
 *
 * Tolérance multi-page NON VÉRIFIÉE sur un relevé réel (l'exemple disponible
 * ne s'étalait que sur une page) : une fois la page de titre trouvée, on
 * continue à inclure les pages suivantes tant qu'elles contiennent au moins
 * une ligne avec un motif de date (hors bandeau bas de page), et on s'arrête
 * dès qu'une page n'en contient plus (ex: la page "En savoir plus" qui suit
 * le tableau dans l'exemple analysé). À vérifier dès qu'un relevé avec un
 * tableau réellement étalé sur plusieurs pages sera disponible.
 */
export async function extraireDetailCarriere(pdf: PDFDocumentProxy): Promise<PeriodeCarriere[]> {
  let lignesTable: string[] = [];
  let tableEnCours = false;

  for (let numeroPage = 1; numeroPage <= pdf.numPages; numeroPage++) {
    const page = await pdf.getPage(numeroPage);
    const textContent = await page.getTextContent();
    const items = textContent.items.filter((item): item is TextItem => 'str' in item);
    if (items.length === 0) continue;

    const lignes = reconstruireLignes(items);

    if (!tableEnCours) {
      const indexTitre = lignes.findIndex((ligne) => RE_TITRE_DETAIL_CARRIERE.test(ligne));
      if (indexTitre === -1) continue;
      tableEnCours = true;
      lignesTable = lignesTable.concat(lignes.slice(indexTitre + 1));
      continue;
    }

    const lignesUtiles = lignes.filter((ligne) => !estLigneChromeOuIgnorable(ligne));
    const contientUneDate = lignesUtiles.some((ligne) => /\d{2}\/\d{2}\/\d{4}/.test(ligne));
    if (!contientUneDate) break;
    lignesTable = lignesTable.concat(lignes);
  }

  return parseDetailCarriereDepuisTexte(lignesTable);
}

/**
 * Exécute une étape du parsing en loguant clairement, en console, à quelle
 * étape une erreur technique inattendue survient (ex: souci de chargement du
 * worker pdf.js, PDF corrompu, changement d'API entre versions de
 * pdfjs-dist...) avant de la propager. L'appelant (Carriere.tsx) affiche
 * volontairement un message générique à l'utilisateur — c'est ici, en
 * console, que doit se trouver le détail exploitable pour déboguer.
 */
async function etape<T>(nom: string, fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`Erreur parsing RIS à l'étape "${nom}":`, error);
    throw error;
  }
}

/**
 * Extrait et parse la page 2 (page "Mes régimes") d'un RIS. Le fichier n'est
 * jamais stocké : il est lu en mémoire (ArrayBuffer) le temps de l'extraction
 * puis abandonné avec le reste de la fonction — aucun envoi réseau, aucune
 * écriture Supabase Storage.
 */
export async function parseRIS(file: File): Promise<ParseRISResult> {
  const arrayBuffer = await etape('lecture du fichier', () => file.arrayBuffer());
  const pdf = await etape('ouverture du PDF', () => getDocument({ data: arrayBuffer }).promise);

  if (pdf.numPages < 2) {
    return { regimes: [], detailCarriere: [], texteIllisible: true };
  }

  const page = await etape('accès à la page 2', () => pdf.getPage(2));
  const textContent = await etape('extraction du texte (getTextContent)', () => page.getTextContent());
  const items = textContent.items.filter((item): item is TextItem => 'str' in item);

  if (items.length === 0) {
    // Page sans texte extractible (scan image) : rien à parser.
    return { regimes: [], detailCarriere: [], texteIllisible: true };
  }

  const lignes = await etape('reconstruction des lignes', () => reconstruireLignes(items));
  const regimes = await etape('parsing des régimes', () => parseRegimesDepuisTexte(lignes));
  const detailCarriere = await etape('extraction du détail de carrière', () => extraireDetailCarriere(pdf));

  return { regimes, detailCarriere, texteIllisible: regimes.length === 0 };
}
