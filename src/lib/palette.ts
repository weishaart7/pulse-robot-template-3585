// Palette du simulateur pour les graphiques et visuels de données (docs/design-system.md).
// Valeurs hexadécimales à 6 chiffres : certains appelants y suffixent une opacité (`${X}1a`).
// Les deux étincelles ElevenLabs (violet, braise) ne servent qu'ici, dans les visuels de
// données et les alertes — jamais sur des boutons, liens ou chrome d'interface.
export const INK = '#0c0a09';
export const GRAPHITE = '#44403b';
export const SMOKE = '#777169';
export const ASH = '#a59f97';
export const STONE = '#ebe8e4';
export const EGGSHELL = '#fdfcfc';
export const VIOLET = '#0447ff';
export const EMBER = '#ff4704';
export const VIOLET_SOFT = '#8fa6ff';
export const EMBER_SOFT = '#ffa47f';

// Gains / pertes : conventions financières, désaturées pour rester dans le registre chaud.
export const POSITIVE = '#2f7d4f';
export const NEGATIVE = '#e5484d';

// Séries catégorielles, dans l'ordre d'attribution : alternance encre / violet / braise,
// puis leurs déclinaisons claires, pour rester distinctes jusqu'à 10 catégories.
export const SERIES = [
  INK,
  VIOLET,
  EMBER,
  SMOKE,
  VIOLET_SOFT,
  EMBER_SOFT,
  GRAPHITE,
  ASH,
  '#0a2a99',
  '#ffd2bd',
] as const;
