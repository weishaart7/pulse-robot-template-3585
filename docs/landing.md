# Landing page

Route `/` → [src/pages/Index.tsx](../src/pages/Index.tsx). Page publique de présentation,
sans données utilisateur. Composants dans [src/components/landing/](../src/components/landing/).

## 1. Références graphiques

- [getuni.co](https://www.getuni.co)

## 2. Structure

Ordre des sections dans `Index.tsx` :

1. `LandingNav` (navbar fixe)
2. `HeroCommon`
3. `ModulesRollingSection`
4. `ParticuliersSection`
5. `ProfessionnelsSection`
6. `CredibiliteSection`
7. `HowItWorksSection`
8. `ConfianceSection`
9. `PricingSection`
10. `FAQSection`
11. `LandingFooter`

`EditorialChecklistSection.tsx` est le gabarit partagé (texte + checklist) utilisé par les
sections Particuliers, Professionnels, Crédibilité, HowItWorks et Confiance, qui ne font que
lui passer leur contenu.

## 3. Navbar

`LandingNav` rend [elevate-navbar.tsx](../src/components/ui/elevate-navbar.tsx)
(`ElevateNavbar`, adapté de Hyperiux Vault « Elevate Navbar »).

- Pastille noire centrée, fixe en haut (`top-12`), coins 12 px, **aucune ombre**.
- Liens : Fonctionnalités, Tarifs, À propos (ancres) ; CTA blanc « Se connecter » → `/login`.
- Survol : bascule verticale du texte animée avec GSAP.
- Mobile (< 768 px) : bouton menu ouvrant un panneau déroulant, avec focus trap.
- **Animation d'apparition** : la barre s'étend horizontalement depuis son centre
  (`clip-path` de `inset(0 50%)` à `inset(0 0)`), 0,8 s, délai 0,15 s, courbe
  `cubic-bezier(0.22, 1, 0.36, 1)`, fondu bref au départ. Aucun déplacement vertical.
  Classes `nav-intro-centered` (desktop) et `nav-intro` (barre mobile) dans
  [src/index.css](../src/index.css). Remplissage `backwards` uniquement, pour que le
  `clip-path` ne coupe pas les dropdowns une fois l'animation finie. Désactivée si
  `prefers-reduced-motion`.
