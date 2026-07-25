import { AlerteContext, AlerteActive } from './types';
import { REGLES_ALERTES_CONSEIL } from './regles';

export * from './types';
export { REGLES_ALERTES_CONSEIL } from './regles';

export const evaluerAlertes = (ctx: AlerteContext): AlerteActive[] =>
  REGLES_ALERTES_CONSEIL.filter((regle) => regle.condition(ctx)).map((regle) => ({
    id: regle.id,
    niveau: regle.niveau,
    message: typeof regle.message === 'function' ? regle.message(ctx) : regle.message,
  }));
