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
- Logo : `AureviaLogo` (`src/components/brand/AureviaLogo.tsx`), SVG inline en `currentColor`
  (couleur via `text-*`), même tracé que `public/logo.svg` (aussi favicon, avec `public/favicon.ico`).

## 5. Cadre de l'app (`src/components/layout`)

- Fond eggshell partout. Dashboard (`.dashboard-shell`, `index.css`) : coins des cartes resserrés à **8 px** — règle qui écrase `rounded-card`,
  `rounded-2xl`, `rounded-3xl` et `rounded-[16|18|20|22px]` à l'intérieur du dashboard, sans toucher la landing ni
  les fenêtres (dialogues, menus) rendues hors du cadre.
- Listes déroulantes (`components/ui/select.tsx`) : champ à angles 2 px, filet foncé au survol / à l'ouverture / au focus (plus d'anneau bleu), chevron gris qui pivote à l'ouverture ; menu à angles 4 px, options en 13 px, survol gris clair (plus de surbrillance en couleur primaire), option choisie en gras avec une coche noire à droite.
- Cases à cocher (`components/ui/checkbox.tsx`) : carré 16 px à angles 2 px, filet gris foncé (plus soutenu au survol), cochée en noir avec coche blanche ; plus d'ombre.
- Calendriers : tous passent par [date-picker-panel.tsx](../src/components/ui/date-picker-panel.tsx) (le `Calendar` de `components/ui/calendar.tsx` n'en est plus qu'un adaptateur, mode « single » seul). Trois vues : jours (lundi en premier, libellés français), mois, années par pages de 20 ; clic sur le mois ou l'année de l'en-tête pour y sauter. Angles 2 px, jour choisi en noir, aujourd'hui cerné d'un filet. Bornes : 1900 en bas ; en haut `maxDate` si fourni (dates passées seulement dans `SmartDateInput`), sinon aujourd'hui + 50 ans.
- Notifications : seules les **erreurs** s'affichent (variante `destructive` de `toaster.tsx`, `toast.error` de Sonner) ; les confirmations de succès / info sont masquées de façon centrale, les appels restent en place dans le code.
- Zone principale (`DashboardLayout.tsx`) : défilement **sans barre visible** (classe utilitaire `.no-scrollbar`, `index.css`, aussi posée sur le défilement horizontal de l'arbre familial) ; un fondu vers le fond eggshell (48 px) apparaît en bas tant qu'il reste du contenu sous la ligne de flottaison.
- Écran large (≥ `md`) : **pas de barre du haut**. Fond noir chaud `#1e1d19` sur toute la hauteur ; la zone de
  contenu est une plaque eggshell coins 8 px, entourée d'une bande de 14 px de ce noir (haut, bas, droite ; à gauche,
  la barre latérale qui se prolonge dans le même noir). Navigation dans `DashboardSidebar.tsx` : **barre latérale
  noire pleine** calquée sur une maquette de référence (couleurs relevées dessus, tokens Tailwind `sidebar-bg`
  `#1e1d19`, `sidebar-active` `#2c2b28`, `sidebar-card` `#2f2e2c`, `sidebar-ink` `#dcdbd7`, `sidebar-muted`
  `#9d9c97`). Police : Inter chargée avec l'axe `opsz` (14..32), d'où la coupe display aux grandes tailles, lissage `antialiased`.
  Icônes : Phosphor (`@phosphor-icons/react`), propres à la barre latérale (`SIDEBAR_ICONS`), bicolores (`duotone`)
  au repos et pleines (`fill`) sur l'entrée active ; la navigation mobile garde les icônes Lucide.
  - **Dépliée (248 px)** : en-tête logo Aurevia blanc 24 px + « Aurevia » Inter 500 20 px, tracking -0.03em
    (→ `/`), bouton de repli (`SidebarSimple`) à droite. 9 modules en lignes de 36 px espacées de 4 px, icône
    18 px + libellé Inter 350 14 px tracking -0.01em en `sidebar-ink` (blanc et fond blanc 4 % au survol) ; module
    actif en pilule `sidebar-active` coins 6 px, texte blanc. Le sous-menu du module actif (`useModuleSubNav` :
    Patrimoine, Immobilier, Sociétés, Budget, Retraite) s'affiche imbriqué sous sa ligne (texte aligné sur les libellés des modules), via `TreeNav` en variante
    `thread` (`components/ui/tree-nav.tsx`, lignes de 32 px, Inter 13 px) : fil vertical 1 px gris sous l'icône du
    module ; un segment blanc de 3 × 16 px glisse le long du fil vers l'entrée survolée puis revient sur l'entrée
    active, en s'étirant selon sa vitesse (jusqu'à 44 px) avant de se recontracter ; l'entrée repérée passe en blanc,
    les autres en gris ; animations coupées si
    `prefers-reduced-motion` ; `aria-current="page"`. Ses couleurs passent en clair grâce à la classe
    `.sidebar-dark` (`index.css`), qui inverse localement `--foreground`, `--muted-foreground`, `--border`,
    `--primary` et `--ring`. Le panneau mobile garde la variante `rail` (rail vertical, repère losange). En bas : Blog, Nouveautés, Suggestion (lignes de 32 px, 13 px, icônes 16 px), puis carte profil
    `sidebar-card` coins 6 px (pastille initiale 32 px, nom 14 px 400 — `full_name` des métadonnées, sinon
    début de l'e-mail —, e-mail 12 px `sidebar-muted`, `DotsThreeVertical`) qui ouvre `ProfileMenu` à droite.
  - **Repliée (64 px)** : rail d'icônes seules (logo, modules, liens du bas, profil), sous-menu masqué,
    infobulles à droite. Bascule par glissement de largeur (bouton de l'en-tête, `⌘B` / `Ctrl+B`) ; état
    mémorisé en `localStorage` (`kairos.sidebar.open`).
  - `SidebarNav` (nom du module + `TreeNav` sur fond clair) reste exporté pour le panneau mobile.
- Téléphone (< 768 px) : rail et panneau masqués. Barre du haut (`DashboardTopNav`, `md:hidden`) :
  bouton menu, logo Aurevia encre, sélecteur de modules en pilules sur piste taupe filetée (module actif en
  pastille encre, ramené en vue), profil. Le bouton menu ouvre un panneau latéral gauche taupe avec
  le même contenu (`SidebarNav`) plus les liens du bas. Marge latérale de la zone principale 16 px
  (`px-4`), 24 px à partir de `md`.
- Alertes conseil : `destructive` (critique), `spark` (élevé), taupe (moyen), coins 20 px.
- Vue d'ensemble : voir [dashboard.md](dashboard.md).

## 6. Formulaires (Actifs, Famille)

Plus de scope dédié : les formulaires suivent les tokens de `:root`.
- Touches de couleur (panneaux de travail) reprises du hero de la landing (`public/hero-mesh.png`), tokens
  Tailwind `lagon` (`#55b4bd`, `ink` `#16707a`, `soft` `#e3f3f4`) et `citron` (`#d9fd86`, `ink` `#4a5a10`, `soft`
  `#f1fcd0`), toujours par petites touches : pastille lagon de l'icône du fil d'Ariane, trait lagon 3 px devant les
  titres de section (`SectionHeader`), liens « Voir la fiche » en lagon foncé, étiquette « Avec / Sans contrat » lagon,
  « Oui » des donations au dernier vivant en étiquette citron, point citron sur l'onglet actif (`GooeyNav`), repères
  carrés lagon / citron de la Composition du Foyer. Texte secondaire `#4f4a45`, filets `#d8d2ca`, valeurs de synthèse
  en 500, titres de panneau 16 px, titres de page 28 px, surtitres de l'arbre en 11 px.
- Gabarit compact des panneaux de travail : barre d'en-tête 64 px collée au bord haut — 16 px au-dessus et au-dessous du bouton de 32 px, espace égal entre
  le bord supérieur et le filet (fil d'Ariane 12,5 px, pastille 24 px), titres
  de page 24 px, titres de section / panneau 14,5 px, lignes de synthèse 13 px (libellés 104 px), étiquettes 24 px
  de haut en 12 px, boutons 32 px en 12,5 px, champs et bouton calendrier 36 px, saisie 13 px, libellés de champs
  12,5 px, `text-sm` 13 px et `text-xs` 12 px, onglets `GooeyNav` 12,5 / 13 px, chiffres de Composition 20 px.
  Ces valeurs priment sur les tailles plus grandes citées plus bas pour ces deux pages.
- Panneaux de travail (Foyer, Régime matrimonial) : briques communes dans `components/layout/workspace-panel.tsx`
  (`WorkspaceHeader` fil d'Ariane + actions, `PanelTitle`, `SummaryRow`, `Chip`, `PanelDivider`) et classe
  `.workspace-panel` pour la lisibilité. Foyer : bandeau en colonnes `divide-x` (Client, Conjoint, Statut +
  Composition en chiffres 22 px), arbre pleine largeur dessous ; bouton « Gérer les membres » à contour et menu
  Statut du couple à angles quasi droits (2 px). Même angle de 2 px pour le bouton « Enregistrer », les étiquettes
  (`Chip`) et tous les champs des panneaux de travail (saisies, menus déroulants, bouton calendrier — règle
  `.workspace-panel` dans `index.css`).
- Régime matrimonial (`RelationInfoForm`, `components/famille/matrimonial/*Section`) : panneau unique sans cadre
  propre (bord à bord de la plaque de contenu, marges du `main` annulées par `-mx-4 -mt-3 md:-m-6`, pas de « carte
  dans la carte » — idem Foyer), barre d'en-tête 56 px (fil d'Ariane 13 px, bouton noir coins 6 px), grille `1fr | 320px` séparée par un filet
  vertical ; sections `px-8 py-7` séparées par `divide-y` ; titres de section en sans 15 px 500 (`SectionHeader`,
  sans icône — aussi dans Fiche client / Conjoint) ; panneau « Synthèse » en lignes libellé (smoke, colonne 112 px) /
  valeur (encre) 13 px, étiquettes taupe coins 6 px.
  Lisibilité renforcée sur tout le panneau via la classe `.workspace-panel` (`index.css`) : texte secondaire
  plus foncé que le smoke, filets marqués, bordure des champs plus marquée, `text-xs` relevé à 13 px et
  `text-sm` à 14 px, libellés de champs homogènes (13 px 500 encre), saisie en 14 px ; synthèse en 14 px,
  étiquettes sur fond pierre `#e9e5e0` 13 px.
  Navigation entre onglets : `GooeyNav` (`components/ui/gooey-nav.tsx`, adapté de rare-ui « gooey-nav » sans
  Next.js) — barre pierre `#e9e5e0` d'où l'onglet actif (fond encre, texte eggshell) se détache de 12 px avec
  un « col » visqueux qui s'étire puis se rompt (ressort court 0,38 s, léger rebond ; couleurs en fondu 200-300 ms ;
  point citron qui se déplie en largeur, sans saut de mise en page), angles quasi droits (2 px), Inter 500 14 px, padding 10 px, point citron devant le libellé actif, inactifs en graphite
  `#44403b` (encre au survol) ;
  barre pleine largeur, onglets dimensionnés sur leur libellé et qui rétrécissent ensemble (si un libellé complet ne tient pas, bascule automatique sur les libellés courts `shortLabel` — « Général »,
  « Récompenses », « Donation », « Historique » — infobulle avec le libellé complet ; jamais de défilement) ;
  `role="tablist"`, transition coupée si `prefers-reduced-motion`.
- Cadre `ActifFormFrame` et cartes des formulaires Famille : `rounded-3xl` (ramené à 8 px dans le dashboard), filet `border-border`, fond `bg-card`, sans halo.
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

## Chargements

- Chargeur commun `LoadingSpinner` (`components/ui/loading-spinner.tsx`) : logo Aurevia (`/logo.svg`) rendu en trame
  Ben-Day animée par `Benday` (`components/ui/benday.tsx`, canvas). Réglages : `bake={{ grid: 52, threshold: 0.52,
  gamma: 0.85 }}`, `preset="shimmer"` (vague diagonale qui fait gonfler et foncer les points), `fit="natural"`.
  Tailles : `sm` 56 px (blocs compacts), `md` 112 px (sections, défaut), `lg` 256 px (écran de démarrage, connexion).
  Points en couleur de texte courante ; animation figée si `prefers-reduced-motion` ; `role="status"`.
- `Benday` cuit l'image une fois par jeu de réglages (cache en mémoire) : encre d'une cellule = opacité × (1 − luminance),
  courbe `gamma`, point gardé si encre ≥ `threshold`, rayon ∝ √encre. Presets : `shimmer`, `pulse`, `static`.
- Utilisé pour les chargements de pages et de sections (démarrage, connexion, Famille, Fiscalité, Sociétés,
  Immobilier, Retraite, Transmission). Restent hors périmètre : les petits indicateurs dans les boutons et
  champs (`Loader2` 16 px) et les mentions « Chargement… » dans les tuiles de synthèse Retraite.
