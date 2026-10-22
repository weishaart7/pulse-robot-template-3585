import { DroitCumulRegime } from '@/lib/retraite/pointsCles';

const LIBELLE_DROITS: Record<DroitCumulRegime['nouveauxDroits'], string> = {
  oui: 'nouveaux droits',
  non: 'cotisation sans nouveaux droits',
  a_verifier: 'à vérifier auprès de la caisse',
};

const formatDepuis = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });

/**
 * Nouveaux droits acquis en cumul emploi-retraite intégral, par régime de la
 * personne (pointsCles.ts). Partagé par l'Optimisation et la Synthèse.
 */
export const DroitsCumulEmploiRetraite = ({ droits }: { droits: DroitCumulRegime[] }) => {
  if (droits.length === 0) return null;
  return (
    <ul className="divide-y divide-border border-y border-border">
      {droits.map((d) => (
        <li key={d.regime} className="flex items-baseline justify-between gap-4 py-1.5 text-xs" title={d.source ?? undefined}>
          <span className="text-foreground">{d.libelle}</span>
          <span className={d.nouveauxDroits === 'oui' ? 'text-positive' : 'text-muted-foreground'}>
            {LIBELLE_DROITS[d.nouveauxDroits]}
            {d.nouveauxDroits === 'oui' && d.depuis && ` (depuis le ${formatDepuis(d.depuis)})`}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Résumé en une ligne : régimes ouvrant de nouveaux droits. */
export const resumeDroitsCumul = (droits: DroitCumulRegime[]): string => {
  const ouverts = droits.filter((d) => d.nouveauxDroits === 'oui').map((d) => d.libelle);
  const aVerifier = droits.some((d) => d.nouveauxDroits === 'a_verifier');
  const base = ouverts.length > 0 ? `Nouveaux droits : ${ouverts.join(', ')}` : 'Aucun nouveau droit identifié dans vos régimes';
  return aVerifier ? `${base} (autres régimes à vérifier)` : base;
};
