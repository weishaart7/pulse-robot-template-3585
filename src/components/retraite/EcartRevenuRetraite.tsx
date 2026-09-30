import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEcartRevenuRetraite } from '@/hooks/useEcartRevenuRetraite';
import {
  analyserEcartRevenu,
  capitalProjete,
  annuiteDepuisCapital,
  sortiePERCapital,
  sortiePERRente,
} from '@/lib/retraite/calculEpargneRetraite';
import { PARAMETRES_EPARGNE_RETRAITE, ScenarioEpargne } from '@/lib/retraite/parametres';

const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatPct = (valeur: number) => `${(valeur * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;

const SCENARIOS: { cle: ScenarioEpargne; libelle: string; ecartVie: number }[] = [
  { cle: 'prudent', libelle: 'Prudent', ecartVie: PARAMETRES_EPARGNE_RETRAITE.ecartEsperanceVieScenarios },
  { cle: 'central', libelle: 'Central', ecartVie: 0 },
  { cle: 'favorable', libelle: 'Favorable', ecartVie: -PARAMETRES_EPARGNE_RETRAITE.ecartEsperanceVieScenarios },
];

interface EcartRevenuRetraiteProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

/**
 * Écart entre le budget cible à la retraite et le revenu net du foyer, et
 * couverture par l'épargne retraite projetée (phase 6b de l'audit Retraite,
 * calculEpargneRetraite.ts). Hypothèses saisies ici non persistées.
 */
export const EcartRevenuRetraite = ({ hasConjoint, nomUtilisateur, nomConjoint }: EcartRevenuRetraiteProps) => {
  const { donnees } = useEcartRevenuRetraite(hasConjoint, nomUtilisateur, nomConjoint);

  const [budgetSaisi, setBudgetSaisi] = useState<string>('');
  const [versementAnnuel, setVersementAnnuel] = useState<string>('0');
  const [rendements, setRendements] = useState<Record<ScenarioEpargne, string>>({
    prudent: String(PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.prudent * 100),
    central: String(PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.central * 100),
    favorable: String(PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.favorable * 100),
  });

  if (!donnees) return null;
  const {
    dateDepart,
    anneesAvantDepart,
    netMensuel,
    tmiRetraite,
    budgetCalculeMensuel: budgetCalcule,
    revenusActifsMensuels,
    encoursPER,
    encoursAssuranceVie,
    ageDepart,
    ageReference,
  } = donnees;

  const budgetMensuel = budgetSaisi !== '' ? parseFloat(budgetSaisi) || 0 : budgetCalcule;
  const versement = Math.max(0, parseFloat(versementAnnuel) || 0);
  const rendement = (cle: ScenarioEpargne) => Math.max(0, (parseFloat(rendements[cle]) || 0) / 100);

  const analyse = analyserEcartRevenu({
    netMensuel,
    revenusActifsMensuels,
    budgetMensuel,
    encoursPER,
    encoursAssuranceVie,
    versementAnnuel: versement,
    anneesAvantDepart,
    ageDepart,
    ageReference,
    rendements: { prudent: rendement('prudent'), central: rendement('central'), favorable: rendement('favorable') },
  });
  const { ecartMensuel, deficitAnnuel } = analyse;
  const scenarios = analyse.scenarios.map((sc) => ({
    ...sc,
    libelle: SCENARIOS.find((x) => x.cle === sc.cle)!.libelle,
  }));

  // Sortie du PER (scénario central) : l'encours actuel et les versements
  // futurs sont supposés entièrement déduits ; seuls les gains futurs sont
  // des plus-values.
  const perAuDepart = capitalProjete(encoursPER, versement, rendement('central'), anneesAvantDepart);
  const versementsDeduits = encoursPER + versement * anneesAvantDepart;
  const horizonCentral = Math.max(1, Math.round(ageReference - ageDepart));
  const sortieCapital = sortiePERCapital(perAuDepart, versementsDeduits, tmiRetraite);
  const sortieRente = sortiePERRente(annuiteDepuisCapital(perAuDepart, rendement('central'), horizonCentral), ageDepart, tmiRetraite);

  return (
    <Card className="border border-border">
      <CardHeader className="p-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">Écart de revenu à la retraite</CardTitle>
        <CardDescription className="text-xs">
          Foyer retraité à partir du {dateDepart.toLocaleDateString('fr-FR', { timeZone: 'UTC' })} — montants en euros
          constants
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Revenu net des pensions</div>
            <div className="text-lg font-semibold">{formatEuro0(netMensuel)} / mois</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Revenus d'actifs (bruts)</div>
            <div className="text-lg font-semibold">{formatEuro0(revenusActifsMensuels)} / mois</div>
          </div>
          <div className="p-3 border rounded-lg space-y-1">
            <Label htmlFor="budget-retraite" className="text-xs text-muted-foreground">
              Budget cible
            </Label>
            <Input
              id="budget-retraite"
              type="number"
              placeholder={String(Math.round(budgetCalcule))}
              value={budgetSaisi}
              onChange={(e) => setBudgetSaisi(e.target.value)}
              className="h-8"
            />
            <div className="text-xs text-muted-foreground">
              Calculé : {formatEuro0(budgetCalcule)} / mois (charges actuelles hors crédits terminés)
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">{ecartMensuel >= 0 ? 'Excédent' : 'Déficit'}</div>
            <div className={`text-lg font-semibold ${ecartMensuel >= 0 ? 'text-positive' : 'text-destructive'}`}>
              {ecartMensuel >= 0 ? '+' : '−'}
              {formatEuro0(Math.abs(ecartMensuel))} / mois
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Épargne retraite et couverture du déficit</p>
          <p className="text-xs text-muted-foreground">
            Encours du foyer : PER {formatEuro0(encoursPER)} · assurance-vie {formatEuro0(encoursAssuranceVie)}.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="versement-annuel-per" className="text-xs">Versements annuels futurs sur le PER (€)</Label>
              <Input
                id="versement-annuel-per"
                type="number"
                min={0}
                value={versementAnnuel}
                onChange={(e) => setVersementAnnuel(e.target.value)}
                className="h-8 max-w-[160px]"
              />
            </div>
            {SCENARIOS.map(({ cle, libelle }) => (
              <div key={cle} className="space-y-1">
                <Label htmlFor={`rendement-${cle}`} className="text-xs">Rendement {libelle.toLowerCase()} (%/an)</Label>
                <Input
                  id={`rendement-${cle}`}
                  type="number"
                  step={0.5}
                  min={0}
                  value={rendements[cle]}
                  onChange={(e) => setRendements({ ...rendements, [cle]: e.target.value })}
                  className="h-8 max-w-[100px]"
                />
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scénario</TableHead>
                <TableHead>Épargne au départ</TableHead>
                <TableHead>Revenu permis</TableHead>
                <TableHead>Capital nécessaire</TableHead>
                <TableHead>Couverture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.libelle}>
                  <TableCell>
                    {s.libelle}
                    <span className="block text-xs text-muted-foreground">
                      {formatPct(s.rendement)} / an · {s.anneesVersement} ans de retraite
                    </span>
                  </TableCell>
                  <TableCell>{formatEuro0(s.capitalProjete)}</TableCell>
                  <TableCell>{formatEuro0(s.revenuAnnuelPermis / 12)} / mois</TableCell>
                  <TableCell>{deficitAnnuel > 0 ? formatEuro0(s.capitalNecessaire) : '—'}</TableCell>
                  <TableCell
                    className={s.couverture === null ? undefined : s.couverture >= 1 ? 'text-positive' : 'text-destructive'}
                  >
                    {s.couverture === null ? 'pas de déficit' : formatPct(s.couverture)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {deficitAnnuel > 0 && (
            <p className="text-xs">
              Épargne complémentaire recommandée (scénario central) :{' '}
              {analyse.capitalManquantCentral > 0 ? (
                <>
                  <span className="font-semibold">{formatEuro0(analyse.capitalManquantCentral)}</span> à constituer d'ici
                  le départ, soit environ{' '}
                  <span className="font-semibold">{formatEuro0(analyse.versementAnnuelComplementaire)} / an</span> de
                  versements supplémentaires.
                </>
              ) : (
                "le déficit est couvert par l'épargne projetée."
              )}
            </p>
          )}
        </div>

        {perAuDepart > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-semibold">Sortie du PER (scénario central)</p>
            <p className="text-xs">
              En capital : {formatEuro0(sortieCapital.net)} nets sur {formatEuro0(sortieCapital.brut)} (impôt{' '}
              {formatEuro0(sortieCapital.impot)}, prélèvements sociaux {formatEuro0(sortieCapital.prelevementsSociaux)}).
            </p>
            <p className="text-xs">
              En rente estimée : {formatEuro0(sortieRente.net / 12)} nets / mois sur {formatEuro0(sortieRente.brut / 12)}{' '}
              bruts, pendant {horizonCentral} ans. Capital versé en une fois imposé au barème l'année de sortie : un
              fractionnement sur plusieurs années limite la hausse de tranche.
            </p>
          </div>
        )}

        <div className="space-y-1 pt-3 border-t text-xs text-muted-foreground">
          <p>
            Rendements : hypothèses réelles (après inflation) et nettes de frais, non garanties. Durée de retraite : âge
            de référence INSEE ({ageReference.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ans) ± 5 ans selon
            le scénario.
          </p>
          <p>
            Rente PER estimée par annuité jusqu'à l'âge de référence : la rente d'un assureur est en général plus basse
            (frais, tables de mortalité prudentes). Encours PER actuel supposé entièrement issu de versements déduits.
            Impôt à la sortie approché au taux marginal du foyer retraité ({formatPct(tmiRetraite)}).
          </p>
          <p>
            Revenus d'actifs comptés bruts ; revenus du patrimoine financier non inclus. Hypothèses saisies ici non
            enregistrées.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
