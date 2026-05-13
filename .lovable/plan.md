## Diagnostic

Le fichier `src/components/ui/tabs.tsx` n'est pas le composant shadcn standard que tu utilises dans ton snippet. C'est une version custom (style Reui/Keenthemes) qui empile :

- 3 `variant` (`default`, `button`, `line`) × 2 `shape` (`default`, `pill`) × 4 `size` (`xs`, `sm`, `md`, `lg`) avec ~15 `compoundVariants` via CVA.
- Un `TabsContext` qui force le `variant`/`size` du `TabsList` sur chaque `TabsTrigger`.
- Des classes baked-in : `bg-sidebar p-1`, `data-[state=active]:bg-background`, `data-[state=active]:shadow-sm`, padding, gap, rounded… selon les variants.
- Des sélecteurs SVG forcés : `[&_svg]:text-muted-foreground [&:hover_svg]:text-primary [&[data-state=active]_svg]:text-primary`.

Conséquences quand tu essaies de coller ton snippet :
1. `<TabsList className="grid w-full grid-cols-2">` reçoit aussi `flex items-center bg-sidebar p-1 gap-2 rounded-lg` → fond gris parasite, gap qui casse la grille, padding inattendu.
2. Le `TabsTrigger` reçoit `text-muted-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm` + padding/rounded en plus de tes classes → l'onglet actif a toujours un fond blanc + ombre que tu n'as pas demandés.
3. Les icônes Lucide sont forcées en `text-muted-foreground` puis `text-primary` au hover/actif, peu importe la couleur que tu mets sur le parent.
4. Tailwind-merge gère certains conflits mais pas les sélecteurs `[&_svg]` ni les `data-[state=active]:*` → tes overrides ne « gagnent » pas toujours.

C'est exactement pour ça que dès que tu touches au design, « ça rate ».

## Objectif

Remplacer `src/components/ui/tabs.tsx` par la version shadcn standard (celle que ton snippet attend), tout en gardant la compatibilité avec les usages existants pour ne rien casser.

## Plan

### 1. Réécrire `src/components/ui/tabs.tsx`

Composant shadcn minimal :
- `Tabs` = passthrough de `TabsPrimitive.Root`.
- `TabsList` = `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground` + `className` mergé en dernier.
- `TabsTrigger` = `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm`.
- `TabsContent` = `mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2`.
- Aucune prop `variant`, `shape`, `size`, aucun contexte, aucun forçage de couleur sur les SVG.

Résultat : ton snippet (`grid w-full grid-cols-2`, icônes `<UserRound /> Profile`) s'affiche tel quel, et n'importe quelle classe que tu passes via `className` prend le dessus grâce à `tailwind-merge`.

### 2. Adapter les 4 usages qui dépendent des anciennes props

Audit complet réalisé, voici les seuls fichiers à toucher :

```text
src/components/layout/Navbar.tsx              → variant="line"
src/pages/famille/FamilleSection.tsx          → shape="pill" size="md"  (2 occurrences)
```

Les autres usages (`PatrimoineMainContent`, `TransmissionDashboard`, `AVContractDetail`, `SocietesStrategies`, `FiscalOverviewCard`) n'utilisent que `<TabsList>` nu ou `className="grid w-full grid-cols-X"` → compatibles tels quels avec la nouvelle version.

Adaptations :
- **Navbar (onglets soulignés)** : remplacer `variant="line"` par des classes Tailwind directes sur `TabsList` (`bg-transparent p-0 h-10 border-b`) et sur `TabsTrigger` (`rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none`).
- **FamilleSection (pilules)** : remplacer `shape="pill" size="md"` par `className="rounded-full"` sur `TabsList` et `className="rounded-full min-w-28"` sur `TabsTrigger`.

### 3. Vérification

- Lecture rapide des pages impactées (`/dashboard/famille`, navbar, patrimoine, transmission, fiscalité, sociétés) pour confirmer qu'aucun style ne dépend implicitement des anciens defaults.
- Build TypeScript automatique.

## Détails techniques

- API publique conservée : `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` exportés avec la même signature `React.ComponentProps<typeof TabsPrimitive.X>`.
- Suppression des exports implicites `variant`/`shape`/`size` → les 2 fichiers consommateurs sont migrés dans le même commit pour éviter toute erreur TS.
- On garde `radix-ui` (déjà installé), pas de nouvelle dépendance.

## Hors scope

- Aucune modification de logique métier, de données ou de routes.
- Pas de refonte visuelle des pages : seuls les onglets eux-mêmes changent, et uniquement pour retrouver le rendu shadcn standard que tu attends.
