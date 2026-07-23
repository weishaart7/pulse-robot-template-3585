/**
 * Nombre d'années retenues pour le calcul du SAM, selon l'année de naissance
 * — barème régime général (salariés). Même principe de tranches par
 * `anneeMax` que TRIMESTRES_REQUIS_PAR_GENERATION dans calcul.ts.
 *
 * Simplification assumée : les travailleurs indépendants (ex-RSI) suivent en
 * réalité un barème légèrement décalé, où les 25 années ne sont atteintes
 * qu'à la génération 1953 (et non 1948 comme pour le régime général) — ce
 * module ne modélise que le barème salarié/régime général, pas de barème
 * distinct par origine du régime.
 */
const DUREE_SAM_PAR_GENERATION: { anneeMax: number; duree: number }[] = [
  { anneeMax: 1933, duree: 10 },
  { anneeMax: 1934, duree: 11 },
  { anneeMax: 1935, duree: 12 },
  { anneeMax: 1936, duree: 13 },
  { anneeMax: 1937, duree: 14 },
  { anneeMax: 1938, duree: 15 },
  { anneeMax: 1939, duree: 16 },
  { anneeMax: 1940, duree: 17 },
  { anneeMax: 1941, duree: 18 },
  { anneeMax: 1942, duree: 19 },
  { anneeMax: 1943, duree: 20 },
  { anneeMax: 1944, duree: 21 },
  { anneeMax: 1945, duree: 22 },
  { anneeMax: 1946, duree: 23 },
  { anneeMax: 1947, duree: 24 },
  { anneeMax: Infinity, duree: 25 },
];

export function dureeSAMPourGeneration(anneeNaissance: number): number {
  const tranche = DUREE_SAM_PAR_GENERATION.find((t) => anneeNaissance <= t.anneeMax);
  return tranche ? tranche.duree : 25;
}
