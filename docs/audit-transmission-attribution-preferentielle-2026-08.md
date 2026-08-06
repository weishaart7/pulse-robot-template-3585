# Attribution préférentielle du logement (§5.10, C. civ. art. 831-2) — diagnostic, non implémenté

> **Statut** : correctif 2 de la session du 2026-08-06 arrêté avant codage, sur décision explicite de la
> consigne de session ("ne code pas une version simplifiée sans le signaler — documente l'ampleur réelle
> et arrête-toi"). Correctif 1 (§5.8, droit de jouissance temporaire) a été livré séparément — voir commit
> `feat(transmission): mentionne le droit de jouissance temporaire du logement (§5.8, art. 763)`.

## La règle (référentiel §5.10)

De droit pour le conjoint survivant si deux conditions sont réunies :
1. il a **déjà un droit de propriété** sur le logement (communauté, indivision, quart en PP, legs partiel) ;
2. le logement constituait sa **résidence principale au jour du décès**.

Exclusion : logement détenu via une SCI (c'est la société qui est propriétaire) — sauf recherche possible
d'attribution préférentielle des parts de SCI elles-mêmes si elles dépendent de la communauté. Le refus de
l'attribution n'emporte ni renonciation au droit viager, ni renonciation à la succession.

Effet civil attendu (implicite dans le référentiel, précisé dans la consigne de session) : le conjoint
reçoit le logement **en totalité**. Si sa valeur dépasse son `cashDu` théorique, le surplus devient une
**soulte due aux autres héritiers**. Si elle est inférieure, il complète normalement sur le reste du
résiduel.

## Pourquoi ce n'est pas un simple correctif de montant

Recherche avant codage (demandée par la consigne) : Pulse dispose-t-il d'un mécanisme d'attribution d'un
actif **spécifique** à un héritier précis, par opposition à une répartition en **valeur** ?

Réponse : **non**. Toute la chaîne de calcul de `src/lib/transmission/` est construite sur un modèle
value-based, de bout en bout :

- `Liberalite.valeur` (`src/lib/transmission/types.ts`) est un nombre, jamais une référence à un bien.
  Un legs "à titre particulier" peut cocher des biens dans `LegsForm.tsx` (`formData.biensSelectionnes`),
  mais ce choix ne sert **qu'à calculer un montant** (`montantTotal`, ligne 143-145 de `LegsForm.tsx`) : la
  ligne `Liberalite` réellement persistée et lue par le moteur ne porte que cette valeur agrégée. La liste
  des `asset_id` sélectionnés est bien stockée (`liberaliteService.ts::biens`), mais
  `transmissionHelpers.ts::buildTransmissionLiberalites` (lignes 95-102) ne les relit que pour
  **recalculer un `valeur` à jour** (jointure live sur `assets`), jamais pour propager une identité de bien
  dans `computeTransmission`. Un legs particulier de "la maison" et un legs particulier "50 000 € en
  numéraire" produisent aujourd'hui exactement la même structure de données en sortie de cette fonction.
- `civilShares[].fraction` (`index.ts`, §6bis, lignes 519-523) répartit le **résiduel réel global** (une
  seule masse, tous biens confondus) au prorata de `cashDu` par héritier — il n'existe aucune notion de
  "cet héritier reçoit CE bien-là en particulier, le reste du pot revient aux autres".
- `dmtgAssets` (lignes 621-631) construit une base fiscale par **bien**, mais chaque bien y est valorisé
  puis dilué dans l'assiette globale via `civilShares` au moment du calcul DMTG par bénéficiaire
  (`computeDMTG`, `dmtg/index.ts`) — aucun bien n'est aujourd'hui affecté à 100 % à un seul bénéficiaire
  par construction (le mécanisme le permettrait en théorie pour un bénéficiaire unique avec
  `civilShares` à 100 %, mais rien dans le pipeline actuel n'isole "ce bien va à cette personne" du
  reste de la masse).

Implémenter l'attribution préférentielle correctement demanderait donc d'introduire, pour la première
fois, un concept d'**attribution en nature** qui traverse tout le pipeline :

1. **Éligibilité** : détecter que le conjoint a déjà un droit de propriété préexistant sur le logement
   (communauté/indivision/quart PP/legs partiel) ET que c'était sa résidence principale au décès. Aucune
   des deux données n'est actuellement capturée à ce niveau de granularité (l'app sait qu'un bien a pour
   `nature` "Résidence principale", mais pas qui l'occupait effectivement, ni si le conjoint en détenait
   déjà une quote-part distincte de la part successorale à venir).
2. **Sortie du bien du pool value-based** : la valeur du logement doit être retranchée du calcul générique
   de `cashReparti`/`civilShares` pour les autres héritiers, et affectée en bloc au conjoint.
3. **Soulte** : si valeur du logement > `cashDu` théorique du conjoint, calculer une soulte due aux autres
   héritiers et la réinjecter dans leur répartition — mécanique proche de celle du §6bis (résiduel
   insuffisant), mais dans l'autre sens (ici c'est un excédent chez UN héritier qui doit financer les
   autres, pas un déficit global à répartir proportionnellement).
4. **Alignement fiscal** : la base DMTG du conjoint sur ce bien doit refléter 100 % de sa valeur (pas la
   fraction `civilShares` générique), sans double-compter ni sous-compter les autres héritiers sur le
   reste de la masse.
5. **Interaction avec les mécanismes déjà fragiles documentés ailleurs** (notamment
   `docs/audit-transmission-clamp-double-masse-2026-08.md` et `docs/design-rapport-moins-prenant-2026-08.md`)
   — le clamp double-masse et le rapport en moins-prenant reposent eux-mêmes sur l'hypothèse d'une masse
   unique répartie en valeur ; une attribution en nature change cette hypothèse structurelle pour toutes
   les succession où elle s'applique.

Une version "simplifiée" qui se contenterait d'ajouter la valeur du logement au `cashDu` du conjoint sans
la retirer du pool des autres, ou qui ignorerait la soulte, produirait un résultat civilement faux (double
comptage du bien, ou absence de compensation aux autres héritiers) — c'est précisément le type
d'implémentation à la va-vite que la consigne de session demande d'éviter.

## Recommandation

Traiter l'attribution en nature (attribution préférentielle, mais aussi utile plus tard pour tout partage
en nature demandé par un héritier) comme un chantier à part entière, avec sa propre phase de conception
validée avant codage — pas un correctif ponctuable dans la même session que le droit de jouissance
temporaire. Points à trancher en amont du codage :

- Quelle donnée capture l'éligibilité (propriété préexistante + occupation RP par le conjoint) ? Nouveau
  champ sur `assets`/`family_links`, ou dérivation depuis des données déjà saisies ?
- Le conjoint doit-il pouvoir refuser l'attribution (le référentiel le prévoit) — via une hypothèse
  activable/désactivable, comme le plafonnement IFI ?
- Comment le mécanisme de soulte s'articule-t-il avec le §6bis (résiduel insuffisant) si les deux
  situations coexistent dans la même succession ?

## Tests

Aucun test ajouté pour ce point — pas de code livré. Suite complète toujours à 400 tests passants (398
baseline + 2 nouveaux tests du correctif 1, §5.8).
