# Design system du simulateur

Périmètre : tout ce qui vit sous `/dashboard` (et les popovers / dialogues portés dans `body`).
La landing (`/`, classe `.landing-portal`) a ses propres tokens et n'est pas concernée.

## 1. Direction

Mélange de deux références : **ElevenLabs** (canvas crème chaud, titres Inter 300 au tracking
serré, boutons pilule) et **Awesomic** (filets fins plutôt qu'ombres, grands arrondis, palette
quasi achromatique). Aucune couleur d'interface : l'encre quasi noire porte les actions,
l'unique accent vif `--spark` est réservé aux alertes.

## 2. Tokens (`src/index.css`, `:root`)

| Token | Valeur | Rôle |
|---|---|---|
| `--background`, `--card`, `--popover` | `#fdfcfc` eggshell | Canvas et surfaces |
| `--secondary`, `--muted`, `--accent` | `#f5f3f1` warm taupe | Bandes, fonds secondaires, survols |
| `--border` | `#ebe8e4` stone | Filets |
| `--input`, `--form-field-accent` | `#ddd8d2` | Bordures de champs (un cran plus visible) |
| `--foreground`, `--primary`, `--ring` | `#0c0a09` ink | Texte, boutons pleins, focus |
| `--graphite` | `#44403b` | Texte secondaire appuyé |
| `--muted-foreground` | `#777169` smoke | Texte secondaire |
| `--ash` | `#a59f97` | Texte tertiaire |
| `--spark` | `#ff4704` | Accent vif : alertes et visuels de données |
| `--positive` | `#2f7d4f` | Gains, soldes positifs |
| `--chart-1…6` | encre, violet `#0447ff`, braise, smoke, violet clair, braise claire | Séries de graphiques |
| `--destructive` | `#e5484d` | Erreurs / suppression |
| `--radius` | `0.875rem` | `rounded-lg` 14 px, `rounded-md` 12 px, `rounded-sm` 10 px |

Exposés dans Tailwind : `graphite`, `ash`, `spark`, `positive`, `rounded-card` (20 px), `shadow-whisper`
(filet 1 px + flou à 4 %). La landing fige son ancien `--radius` (0.375rem).

## 3. Typographie

Inter partout. Titres de page (`.dashboard-shell h1`) en graisse 300, tracking -0.02em,
interligne 1.12 — la règle prime sur les `font-semibold` posés sur les h1. Classe `.ds-display`
pour un titre d'affichage hors h1. `CardTitle` et `DialogTitle` en 300.

Surtitres techniques (étapes de wizard, en-têtes de section `SectionHeader`) : classe
`.ds-eyebrow`, Geist Mono 11 px en capitales, tracking 0.08em — seul usage mono.

## 4. Composants de base (`src/components/ui`)

- `Button` : pilule (`rounded-full`), 500 ; plein encre + `shadow-whisper`, contour sur filet stone.
- `Card` : `rounded-card` (20 px), filet 1 px, sans ombre.
- `Badge` : pilule, graisse 500.
- `Tabs` : soulignement encre sur l'onglet actif, inactifs en smoke.
- `Checkbox` : coins fixes 5 px (indépendants de `--radius`).
- `Dialog`, `AlertDialog` : coins 24 px, `shadow-whisper`, voile noir 40 %.
- `Popover` : coins 14 px, `shadow-whisper`.

## 5. Cadre de l'app (`src/components/layout`)

- Fond eggshell partout (plus de `bg-white` sur la zone principale).
- Barre du haut : sélecteur de modules en pilules sur piste taupe filetée, module actif en
  pastille encre ; libellés Inter 500 13 px en casse normale ; barre de défilement masquée.
- Barre latérale : plaque taupe coins 20 px ; entrée active en pastille eggshell + `shadow-whisper`,
  inactives en smoke.
- Téléphone (< 768 px, breakpoint `md`) : barre latérale masquée, son contenu (`SidebarNav`, partagé)
  s'ouvre dans un panneau latéral gauche depuis un bouton menu à gauche du logo ; l'onglet de module
  actif est ramené en vue dans la barre du haut ; marge latérale de la zone principale 16 px
  (`px-4`), 24 px à partir de `md`.
- Alertes conseil : `destructive` (critique), `spark` (élevé), taupe (moyen), coins 20 px.
- Vue d'ensemble : voir [dashboard.md](dashboard.md).

## 6. Formulaires (Actifs, Famille)

Plus de scope dédié : les formulaires suivent les tokens de `:root`.
- Cadre `ActifFormFrame` et cartes des formulaires Famille / régime
  matrimonial : `rounded-3xl` (24 px), filet `border-border`, fond `bg-card`, sans halo.
- Blocs de champs internes : `bg-secondary` (taupe), coins 14 px.
- Champs `bg-muted` au focus ou ouverts : bordure encre, fond eggshell (règle globale dans
  `index.css`).
- Actions : boutons `Button` par défaut (pilule encre), y compris « Ajouter un membre » et
  « Voir le détail » de la page Famille.

## 7. Données et couleurs sémantiques

- Palette TS partagée : [src/lib/palette.ts](../src/lib/palette.ts) (`INK`, `VIOLET`, `EMBER`,
  `POSITIVE`, `NEGATIVE`, `SERIES` de 10 couleurs). À utiliser pour Recharts / SVG, ou quand
  un appelant suffixe une opacité hexadécimale.
- Violet et braise ne servent qu'aux visuels de données et aux alertes, jamais au chrome.
- Gains / pertes : `text-positive` / `text-destructive` (et `bg-*/10` pour les fonds).
  Avertissements : `spark` (`bg-spark/10`, `border-spark/30`, icône `text-spark`).
- Catégories d'actifs (`CATEGORY_COLORS`, `lib/patrimoine/utils.ts`), catégories de budget
  (`BudgetResume.tsx`) et `SectorsDonut` suivent `SERIES`.
- Modules alignés : Budget, Patrimoine, page Famille, Sociétés, Fiscalité, Retraite, Immobilier.
  Couleurs de catégorie Tailwind (`blue-*`) ramenées à l'encre ; `orange-*` / `amber-*` vers `spark`.

## 8. Transmission

Garde son scope `.kairos-transmission` ([kairos-transmission.css](../src/components/transmission/kairos-transmission.css))
et ses noms de variables, mais leurs valeurs reprennent le design system : échelle chaude,
surfaces eggshell / taupe, Inter, rayons 10 / 14 / 20 px, ombre murmure, `--data-*` sur `SERIES`,
avertissements en braise. Les variables qui entraient en collision avec shadcn (`--border`,
`--border-strong`, `--positive`, `--positive-soft`) sont renommées `--kt-*` : auparavant, le
`--border` hexadécimal du scope rendait invalide `hsl(var(--border))` des composants shadcn
à l'intérieur du module. `--fill-hover`, utilisé mais jamais défini, vaut désormais taupe.

## 9. Mode sombre

Supprimé : ni bloc `.dark` dans `index.css`, ni `darkMode` dans `tailwind.config.ts`, ni classes
`dark:` dans les composants. Les toasts (`sonner.tsx`) sont forcés en thème clair (ils suivaient
auparavant le thème du système, faute de `ThemeProvider`).

## 10. Points ouverts

- Quelques couleurs Tailwind codées en dur hors du périmètre traité : sections du régime
  matrimonial (`RecompensesSection`, `CreancesEntreEpouxSection`), `IndivisairesSection`,
  pages Blog et Nouveautés, composants `ui/` génériques (`toast`, `action-hub-input`).
- Écrans non vérifiés à l'écran après la refonte : onglets de Transmission hors Synthèse,
  onglets de détail de Retraite, Immobilier (LMNP) et Fiscalité (IFI), Sociétés avec données.
