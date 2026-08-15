/**
 * Liste blanche des régimes de retraite français pouvant apparaître sur un
 * RIS (relevé individuel de situation, info-retraite.fr), utilisée par
 * `ressembleAUnNomDeRegime()` dans parseRIS.ts pour reconnaître une ligne
 * "nom de régime" sur la page "Mes régimes" — remplace une heuristique
 * précédente bien plus permissive (toute ligne courte ne commençant pas par
 * un chiffre), qui confondait à tort des fragments de texte descriptif de la
 * colonne voisine (mise en page à 2 colonnes, cf. docs/audit/audit-import-ris.md
 * §4) avec de vrais noms de régime.
 *
 * Recherche menée le 2026-08-15 (web) pour établir cette liste : aucune
 * source consultée ne fournit un dump officiel exhaustif des libellés RIS
 * tels qu'affichés à l'écran (chaîne exacte) pour l'ensemble des régimes
 * existants — seulement les noms légaux/marques publiques des caisses. Les 5
 * entrées `L'Assurance retraite` / `Agirc-Arrco` / `Ircantec` / `RAFP` / `RCI`
 * sont confirmées par observation directe sur un RIS réel (cf. exemples/ —
 * non commité). Toutes les autres entrées sont des candidats non vérifiés
 * pixel-perfect : la correspondance par mot-clé (plutôt qu'égalité stricte)
 * est un choix délibéré pour tolérer les variantes de libellé qu'on n'a pas
 * pu confirmer faute d'échantillon réel couvrant ces régimes.
 *
 * Sources : cnavpl.fr, cnracl.retraites.fr, msa.fr, previssima.fr (régimes
 * spéciaux, post-réforme 2023 — SNCF/RATP/CNIEG/CRPCEN/Banque de France
 * fermés aux nouveaux entrants depuis le 01/09/2023 mais continuent
 * d'apparaître sur les RIS des affiliés déjà en poste), cnbf.fr, ircec.fr.
 */

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Mots-clés reconnus, en majuscules et sans diacritiques (comparés à une
 * ligne normalisée de la même façon). Un mot-clé matche s'il apparaît dans
 * la ligne délimité par un début/fin de chaîne ou un caractère non
 * alphanumérique de part et d'autre — évite qu'un sigle court (ex: "RCI",
 * "SRE") ne matche accidentellement à l'intérieur d'un autre mot.
 */
const MOTS_CLES_REGIMES_CONNUS: readonly string[] = [
  // Régime général et rattachés (confirmés sur RIS réel)
  'ASSURANCE RETRAITE',
  'AGIRC-ARRCO',
  'AGIRC ARRCO',
  'IRCANTEC',
  'RAFP',
  'RCI',

  // Complémentaire artistes-auteurs (distincte de la RAFP, cf. ircec.fr)
  'IRCEC',
  'RAAP',
  'RACD',
  'RACL',

  // CNAVPL et sections professions libérales (cnavpl.fr)
  'CNAVPL',
  'CIPAV',
  'CARMF',
  'CARPIMKO',
  'CARCDSF',
  'CAVP',
  'CAVEC',
  'CARPV',
  'CAVOM',
  'CAVAMAC',
  'CRN',
  'CPRN',

  // Avocats — caisse autonome hors CNAVPL (cnbf.fr)
  'CNBF',

  // Fonction publique — deux régimes distincts
  'SRE',
  'CNRACL',

  // Agricole — salariés et non-salariés (msa.fr)
  'MSA',

  // Régimes spéciaux (previssima.fr) — "fermé aux nouveaux entrants depuis
  // 2023" ne veut pas dire supprimé : continuent d'apparaître sur les RIS
  // des affiliés déjà en poste ou déjà retraités pendant des décennies.
  'SNCF',
  'CPRP SNCF',
  'RATP',
  'CRP RATP',
  'CNIEG',
  'CRPCEN',
  'BANQUE DE FRANCE',
  'ENIM',
  'CANSSM',
  'CAVIMAC',
  'CROP',
  'CRPCF',
];

const REGEX_MOTS_CLES: RegExp[] = MOTS_CLES_REGIMES_CONNUS.map((motCle) => {
  const motEchappe = motCle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^A-Z0-9])${motEchappe}(?:[^A-Z0-9]|$)`);
});

/**
 * Teste si une ligne contient un mot-clé de régime connu. Ne garantit pas
 * que la ligne entière est un libellé de régime "propre" (elle peut inclure
 * du texte environnant) — l'appelant (`ressembleAUnNomDeRegime()`) utilise
 * la ligne telle quelle comme nom si elle matche, cohérent avec le
 * comportement précédent.
 */
export function estNomDeRegimeConnu(ligne: string): boolean {
  const normalisee = normaliser(ligne);
  return REGEX_MOTS_CLES.some((regex) => regex.test(normalisee));
}
