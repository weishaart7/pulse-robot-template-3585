// Repère des champs obligatoires, à la suite du libellé. Lagon et non rouge : le rouge est réservé
// aux erreurs (libellé et message du champ en défaut).
export const RequiredMark = () => (
  <span aria-hidden="true" className="ml-0.5 text-lagon-ink">*</span>
);
