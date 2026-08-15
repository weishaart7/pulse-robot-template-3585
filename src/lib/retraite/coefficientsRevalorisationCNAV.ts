/**
 * Coefficients annuels de revalorisation CNAV des salaires portés au compte,
 * appliqués à un revenu de l'année N pour l'exprimer en valeur actuelle avant
 * plafonnement au PASS de l'année (voir calculSAM.ts — l'ordre revalorisation
 * puis plafonnement compte).
 *
 * Source : circulaire CNAV 2025-29 du 22/12/2025 (legislation.lassuranceretraite.fr,
 * applicable aux liquidations à compter du 01/01/2026), téléchargée et
 * extraite directement (pas de résumé intermédiaire) le 2026-08-15 pour
 * étendre la table 2018-2025 déjà en place à 1930-2025.
 *
 * ⚠️ Découverte importante lors de cette recherche (vérifiée en comparant 3
 * circulaires CNAV différentes) : cette table N'EST PAS stable dans le
 * temps une fois publiée. Elle est recalculée EN TOTALITÉ à chaque nouvelle
 * circulaire annuelle (chaque année ajoutée à la série d'inflation hors
 * tabac recalcule rétroactivement l'ensemble des coefficients). Exemple
 * observé : le coefficient appliqué au salaire de 1990 valait 1,570 dans la
 * circulaire 2023-3 (revalorisation 2023), 1,653 dans la 2023-34
 * (revalorisation 2024), et 1,704 dans la 2025-29 ci-dessous (revalorisation
 * 2026). La table ci-dessous est donc une PHOTO datée de la circulaire
 * 2025-29, valable pour une liquidation à cette date — pas un barème
 * universel intemporel. C'est une limite déjà présente dans l'architecture
 * d'origine de ce module (la table 2018-2025 déjà en place avant cette
 * session avait la même nature, simplement non documentée comme telle) ;
 * ce n'est pas un défaut introduit par cette extension. Cf.
 * docs/audit/audit-import-ris.md §3 pour le détail de cette recherche —
 * cette instabilité n'appelle pas de changement structurel dans le cadre
 * de cette session (pas de mécanisme de versionnage par date de
 * liquidation), seulement cette mise en garde : la table sera à rafraîchir
 * périodiquement depuis la circulaire CNAV la plus récente.
 *
 * Base légale du mécanisme de revalorisation lui-même (stable, à la
 * différence des valeurs) : art. L.161-23-1 du Code de la sécurité sociale
 * (indexation sur les prix hors tabac depuis 1987, art. L.161-25 CSS).
 */
export const COEFFICIENT_REVALORISATION_CNAV: Record<number, number> = {
  1930: 2592.229,
  1931: 2592.229,
  1932: 2592.229,
  1933: 2592.229,
  1934: 2592.229,
  1935: 2592.229,
  1936: 2329.701,
  1937: 1864.728,
  1938: 1691.672,
  1939: 1552.723,
  1940: 1552.723,
  1941: 1035.599,
  1942: 665.477,
  1943: 665.477,
  1944: 537.535,
  1945: 266.281,
  1946: 219.192,
  1947: 170.736,
  1948: 119.205,
  1949: 100.755,
  1950: 88.389,
  1951: 62.722,
  1952: 52.265,
  1953: 51.546,
  1954: 48.169,
  1955: 44.397,
  1956: 39.633,
  1957: 36.865,
  1958: 32.475,
  1959: 29.387,
  1960: 27.287,
  1961: 23.726,
  1962: 20.453,
  1963: 18.255,
  1964: 16.442,
  1965: 15.381,
  1966: 14.534,
  1967: 13.759,
  1968: 12.683,
  1969: 10.995,
  1970: 9.988,
  1971: 8.958,
  1972: 8.073,
  1973: 7.459,
  1974: 6.576,
  1975: 5.535,
  1976: 4.702,
  1977: 4.056,
  1978: 3.647,
  1979: 3.325,
  1980: 2.924,
  1981: 2.58,
  1982: 2.304,
  1983: 2.173,
  1984: 2.06,
  1985: 1.974,
  1986: 1.93,
  1987: 1.858,
  1988: 1.816,
  1989: 1.751,
  1990: 1.704,
  1991: 1.677,
  1992: 1.623,
  1993: 1.623,
  1994: 1.595,
  1995: 1.577,
  1996: 1.538,
  1997: 1.522,
  1998: 1.505,
  1999: 1.487,
  2000: 1.48,
  2001: 1.449,
  2002: 1.418,
  2003: 1.395,
  2004: 1.374,
  2005: 1.348,
  2006: 1.324,
  2007: 1.302,
  2008: 1.29,
  2009: 1.279,
  2010: 1.267,
  2011: 1.256,
  2012: 1.231,
  2013: 1.205,
  2014: 1.191,
  2015: 1.191,
  2016: 1.19,
  2017: 1.19,
  2018: 1.181,
  2019: 1.164,
  2020: 1.153,
  2021: 1.149,
  2022: 1.137,
  2023: 1.085,
  2024: 1.031,
  2025: 1.009,
};
