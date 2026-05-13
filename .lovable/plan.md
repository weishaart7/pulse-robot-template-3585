## Objectif
Aligner le composant `Tabs` avec le design que tu as fourni, sans changer son API d’usage.

## Constat
Le composant n’est pas “mal copié” : il applique bien la structure du snippet, mais le rendu final est modifié par le contexte du projet.

## Cause racine
1. **Le snippet vient d’un contexte Tailwind plus récent que le projet**
   - Le projet utilise **Tailwind CSS v3.4.11**.
   - Le snippet fourni utilise des conventions/classes prévues pour un setup plus récent.
   - Certaines classes ont déjà été adaptées (`outline-none`, `shadow-sm`), mais cela ne suffit pas à garantir un rendu identique.

2. **Le design dépend des tokens du thème local**
   - `TabsList` en variant `default` utilise `bg-accent`.
   - `TabsTrigger` actif utilise `data-[state=active]:bg-background`.
   - Dans ce projet, `--accent` est un **vert vif** et `--radius` vaut **1rem**.
   - Donc même avec le bon code, le composant prend naturellement le style du design system local, pas forcément celui de la démo d’origine.

3. **L’usage actuel ne force pas un style spécifique supplémentaire**
   - Dans `FamilleSection.tsx`, les tabs sont appelés avec `shape="pill" size="md"`.
   - Cela active bien la forme “pill”, mais laisse les couleurs/fonds dépendre des tokens globaux du projet.

4. **Le composant est partagé**
   - Il est aussi utilisé ailleurs (`Navbar`, `FiscalOverviewCard`, `TransmissionDashboard`, etc.).
   - Toute modification globale du variant `default` impactera plusieurs écrans.

## Plan de correction
1. **Stabiliser le rendu de `Tabs` sur Tailwind v3**
   - Vérifier et remplacer toutes les classes incompatibles restantes par leurs équivalents v3.
   - Conserver la même API (`variant`, `shape`, `size`) pour éviter les régressions.

2. **Séparer le “design du snippet” du thème global du projet**
   - Ajuster le variant `default` pour qu’il reproduise explicitement le rendu voulu, au lieu de trop dépendre de `bg-accent` / `bg-background`.
   - Garder l’usage des tokens sémantiques du projet autant que possible.

3. **Limiter l’impact sur les autres écrans**
   - Soit en affinant le variant `default`,
   - soit en créant un variant dédié si le design fourni est très spécifique à `FamilleSection`.

4. **Valider sur les usages existants**
   - Contrôler au minimum `FamilleSection` et `Navbar` pour éviter une régression visuelle.

## Détail technique
Les éléments actuellement responsables du décalage visuel sont surtout :
- `bg-accent` sur la liste
- `data-[state=active]:bg-background` sur l’onglet actif
- le rayon global `--radius`
- les tokens `--accent`, `--background`, `--foreground` définis dans `src/index.css`

## Résultat attendu
Après correction, le composant gardera la structure que tu as fournie, mais son apparence sera enfin cohérente avec le rendu attendu, au lieu d’être “recoloré” par le thème actuel du projet.