// Signale le premier champ en erreur d'un formulaire sans notification flottante : le champ
// est amené à l'écran, prend le focus, tremble brièvement et s'entoure d'orange (classe
// `champ-invalide`, index.css). Repère le champ par son message d'erreur (FormMessage,
// id `…-form-item-message`), seul élément commun à tous les types de champs.
// `ramener` (enregistrement) : défilement et focus sur le champ ; faux à la sortie du champ,
// pour ne pas y renvoyer l'utilisateur qui vient de le quitter.
export function signalerChampInvalide(racine: ParentNode = document, { ramener = true } = {}): void {
  // Deux images : laisse le temps à un changement d'onglet et aux messages de s'afficher.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const message = racine.querySelector<HTMLElement>('[id$="-form-item-message"]');
    const champ = message?.parentElement;
    if (!champ) return;
    if (ramener) {
      champ.scrollIntoView({ behavior: 'smooth', block: 'center' });
      champ.querySelector<HTMLElement>('input, textarea, button[role="combobox"]')?.focus({ preventScroll: true });
    }
    champ.classList.remove('champ-invalide');
    void champ.offsetWidth; // relance l'animation si le champ était déjà signalé
    champ.classList.add('champ-invalide');
    champ.addEventListener('animationend', () => champ.classList.remove('champ-invalide'), { once: true });
  }));
}
