import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
// Import `?url` : Vite résout ce fichier comme un asset statique et renvoie
// son URL finale (avec hash) dans le bundle de prod. Le pattern
// `new URL('pdfjs-dist/...', import.meta.url)` casse silencieusement en
// production (le worker ne se charge pas, pdf.js échoue plus loin avec une
// erreur cryptique sans rapport apparent) — voir mozilla/pdf.js#19519.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { estNomDeRegimeConnu } from './regimesConnus';

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

// 'maternite' (écart #11 partiel, docs/retraite.md) : distincte de 'maladie'
// pour permettre à anneesExclues() (calculSAM.ts) de ne jamais exclure une
// année composée uniquement de périodes assimilées maternité (référentiel
// §3.4.4, exception explicite). Jamais auto-détectée à l'import RIS — le
// texte source ne permet pas de distinguer une IJ maternité d'une maladie
// ordinaire (cf. classifierTypeActivite() ci-dessous) — reclassification
// manuelle par le conseiller via PeriodeCarriereEditDialog.tsx uniquement.
export type TypeActivite = 'employeur' | 'chomage' | 'maladie' | 'maternite' | 'micro_entrepreneur';

// Libellés d'affichage — exportés depuis ce fichier (plutôt que dupliqués ou
// gardés locaux à Carriere.tsx) pour être partagés avec PeriodeCarriereEditDialog.tsx
// sans import circulaire entre les deux composants.
export const LIBELLE_TYPE_ACTIVITE: Record<TypeActivite, string> = {
  employeur: 'Employeur',
  chomage: 'Chômage',
  maladie: 'Maladie',
  maternite: 'Maternité (congé/IJ)',
  micro_entrepreneur: 'Micro-entrepreneur',
};

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
  // Devise du montant tel qu'il apparaît sur le RIS avant conversion —
  // absent (undefined) pour les périodes sans revenu renseigné, cohérent
  // avec `revenu: null`. `revenu` est toujours en euros : quand
  // `deviseOrigine === 'FRF'`, `revenu` est déjà le résultat de la
  // conversion (cf. parserRevenu() / convertirFrancsEnEuros()).
  deviseOrigine?: 'EUR' | 'FRF';
}

/**
 * Reconstruit le texte de la page ligne par ligne à partir des positions des
 * items pdf.js (regroupement par coordonnée Y), pour que les régimes du RIS
 * restent séparés par un saut de ligne — un simple `join(' ')` de tous les
 * items mélangerait les blocs et casserait le parsing par régime.
 */
/**
 * Écarte un item pdf.js correspondant à un artefact de page fixe (code
 * document en haut de chaque page, bandeau de pagination "Edité le ...") —
 * réutilise RE_LIGNE_CODE_DOCUMENT / RE_LIGNE_PIED_DE_PAGE, définies plus
 * bas dans ce fichier (référence résolue à l'appel, pas au chargement du
 * module : sans risque malgré l'ordre textuel).
 *
 * Sur un relevé dense réel, le code document "DAICRISE01V03 88077569" (un
 * unique item pdf.js positionné en haut de CHAQUE page) est retombé, par
 * collision de coordonnée Y, sur la même ligne reconstruite qu'un vrai
 * contenu — 2 conséquences observées : un régime "Agirc-Arrco" renommé
 * "DAICRISE01V03 88077569 Agirc-Arrco", et une ligne de revenu entière
 * écartée car elle ne commençait plus par une date une fois fusionnée (cf.
 * docs/audit/audit-import-ris.md §2 et §4). Retirer ces items AVANT le
 * regroupement par ligne (plutôt que de gérer la ligne déjà polluée après
 * coup) empêche la collision au lieu d'en traiter les symptômes un par un.
 */
function estItemArtefactDePage(texte: string): boolean {
  return RE_LIGNE_CODE_DOCUMENT.test(texte) || RE_LIGNE_PIED_DE_PAGE.test(texte);
}

export function reconstruireLignes(items: TextItem[]): string[] {
  const lignesParY = new Map<number, string[]>();

  for (const item of items) {
    if (!item.str?.trim()) continue;
    if (estItemArtefactDePage(item.str.trim())) continue;
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
 * Reconnaît une ligne "nom de régime" à partir d'une liste blanche de
 * régimes de retraite français connus (regimesConnus.ts), par mot-clé —
 * remplace une ancienne heuristique bien plus permissive (toute ligne
 * courte ne commençant pas par un chiffre), qui confondait à tort des
 * fragments de texte descriptif de la colonne voisine de la page "Mes
 * régimes" (mise en page à 2 colonnes, cf. docs/audit/audit-import-ris.md
 * §4 — ex. "artistes-auteurs" pris pour le nom d'un régime de points RCI)
 * avec de vrais noms de régime.
 *
 * Contrepartie assumée : une ligne dont le nom de régime réel n'est pas
 * dans la liste blanche (régime jamais observé dans les échantillons
 * disponibles) ne sera plus reconnue du tout — le régime correspondant
 * tombera sur le repli `'Régime non identifié'` dans
 * `parseRegimesDepuisTexte()` plutôt que d'afficher un nom incorrect mais
 * plausible. Choix délibéré (honnête-mais-incomplet plutôt que
 * plausible-mais-faux), cf. docs/audit/audit-import-ris.md.
 *
 * Retourne le nom à utiliser (la ligne elle-même), ou `null` si la ligne ne
 * contient aucun mot-clé de régime connu.
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

  return estNomDeRegimeConnu(ligne) ? ligne : null;
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
// Le groupe devise couvre aussi les périodes antérieures à 2002, reportées
// en francs sur le RIS ("92 251 FRF") — cf. docs/audit/audit-import-ris.md
// §2. Seul "FRF" est confirmé par observation directe sur un RIS réel ;
// "Frs"/"FF"/"F" sont des notations historiques plausibles (recherche du
// 2026-08-15) ajoutées par tolérance, sans confirmation qu'elles
// apparaissent réellement sur un RIS réédité aujourd'hui. Ordre de
// l'alternative significatif (le plus long en premier) : "F" est un préfixe
// de "FF"/"FRF", et sans ancrage de fin la regex capturerait sinon
// seulement "F" en laissant "F"/"RF" dans le texte suivant. Un lookahead
// (espace, "(1)" ou fin de ligne) fait office d'ancrage de fin pour chaque
// alternative.
const RE_LIGNE_DONNEES_CARRIERE =
  /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*((?:\d[\d\u00a0\u202f ]*(?:€|FRF|Frs|FF|F)(?=\s|\(1\)|$))\s*(?:\(1\))?)?\s*(.*)$/i;

/**
 * Taux de conversion irrévocable franc→euro (art. 1 du règlement (CE) n°
 * 2866/98 du Conseil du 31/12/1998, JOUE L 359 du 31/12/1998 — applicable
 * au 1er janvier 1999, bascule euro fiduciaire effective au 1er janvier
 * 2002). Recherche et vérification du 2026-08-15.
 */
const TAUX_CONVERSION_FRF_EUR = 6.55957;

/**
 * Convertit un montant en francs vers l'euro selon la règle d'arrondi de
 * l'art. 5 du règlement (CE) n° 1103/97 du Conseil du 17/06/1997 : pas
 * d'arrondi intermédiaire prématuré (`Number` conserve la pleine précision
 * jusqu'à la division), arrondi final au centime le plus proche.
 */
function convertirFrancsEnEuros(montantFrancs: number): number {
  return Math.round((montantFrancs / TAUX_CONVERSION_FRF_EUR) * 100) / 100;
}

// Montant + devise en tête d'un `revenuBrut` déjà isolé par
// RE_LIGNE_DONNEES_CARRIERE (donc sans le repère "(1)", qui suit toujours la
// devise dans les données observées) — mêmes alternatives devise, même
// ordre. Insensible à la casse (le franc s'écrit parfois "frf"/"frs" selon
// l'éditeur).
const RE_MONTANT_ET_DEVISE = /^(\d[\d\u00a0\u202f ]*)(€|FRF|Frs|FF|F)/i;

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

/**
 * `deviseOrigine` distingue un montant réellement saisi en francs (converti
 * ici) d'un montant en euros — traçabilité utile pour vérifier a posteriori
 * qu'une conversion a bien eu lieu, cf. docs/audit/audit-import-ris.md §2.
 * `null` quand `revenuBrut` est absent (période sans revenu renseigné :
 * chômage, maladie...), à distinguer d'un montant présent mais illisible.
 */
function parserRevenu(
  revenuBrut: string | undefined
): { revenu: number | null; estChiffreAffaires: boolean; deviseOrigine: 'EUR' | 'FRF' | null } {
  if (!revenuBrut) return { revenu: null, estChiffreAffaires: false, deviseOrigine: null };
  const estChiffreAffaires = /\(1\)/.test(revenuBrut);

  const matchDevise = revenuBrut.match(RE_MONTANT_ET_DEVISE);
  if (!matchDevise) return { revenu: null, estChiffreAffaires, deviseOrigine: null };

  const chiffres = matchDevise[1].replace(/[^\d,]/g, '');
  if (!chiffres) return { revenu: null, estChiffreAffaires, deviseOrigine: null };
  const montant = parseFloat(chiffres.replace(',', '.'));

  const estFranc = matchDevise[2] !== '€';
  return {
    revenu: estFranc ? convertirFrancsEnEuros(montant) : montant,
    estChiffreAffaires,
    deviseOrigine: estFranc ? 'FRF' : 'EUR',
  };
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

      const { revenu, estChiffreAffaires, deviseOrigine } = parserRevenu(revenuBrut);

      periodes.push({
        employeur: nomCourant,
        typeActivite: typeActiviteCourant,
        dateDebut: convertirDateFrEnIso(dateDebutBrute),
        dateFin: convertirDateFrEnIso(dateFinBrute),
        revenu,
        estChiffreAffaires,
        regimes: regimesCourants,
        ...(deviseOrigine ? { deviseOrigine } : {}),
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
