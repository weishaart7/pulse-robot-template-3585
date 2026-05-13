## Problème

Le composant `tabs.tsx` que tu as collé utilise des utilitaires **Tailwind v4** qui n'existent pas dans ce projet (Tailwind v3). Ces classes sont ignorées au build, donc le rendu ne correspond pas au design.

Classes en cause :
- `focus-visible:outline-hidden` (v4) → n'existe pas en v3
- `data-[state=active]:shadow-xs` (v4) → n'existe pas en v3
- `[&_svg]:size-3.5` etc. → OK en v3 récent, à vérifier
- `text-xs leading-[0.75rem]` → OK

## Correctifs proposés dans `src/components/ui/tabs.tsx`

1. Remplacer toutes les occurrences de `focus-visible:outline-hidden` par `focus-visible:outline-none`.
2. Remplacer `data-[state=active]:shadow-xs` par `data-[state=active]:shadow-sm` (équivalent v3 le plus proche).
3. Garder le reste du fichier identique au code que tu as fourni (variants, compoundVariants, contexte, exports).

Aucune autre modification ailleurs : `FamilleSection.tsx` utilise déjà correctement `<Tabs>`, `<TabsList shape="pill" size="md">` et `<TabsTrigger>`.

## Détails techniques

Diff résumé :

```text
- focus-visible:outline-hidden   →  focus-visible:outline-none      (×2)
- data-[state=active]:shadow-xs  →  data-[state=active]:shadow-sm   (×1)
```

Une fois ces remplacements faits, le pill actif aura bien son fond `bg-background` + ombre légère, exactement comme dans le design de référence.

## Alternative

Si tu préfères migrer le projet vers Tailwind v4 pour éviter ce genre d'écart à chaque composant tiers, c'est un chantier séparé (config, plugins, PostCSS, syntaxe `@theme`) — dis-le moi et je peux te proposer un plan dédié.