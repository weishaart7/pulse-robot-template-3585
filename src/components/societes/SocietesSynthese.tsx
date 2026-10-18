import React, { useEffect, useState } from 'react';
import { PanelTitle, SummaryRow, Chip } from '@/components/layout/workspace-panel';
import { CITRON_INK, CITRON_MID, GREY, GREY_LIGHT, LAGON, LAGON_DEEP, LAGON_INK, LAGON_MID } from '@/components/budget/budgetColors';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocietesIFI, useSocietesTransmission, getSocieteTypeLabel } from '@/hooks/useSocietesIntegration';
import { societeBilanService, SocieteBilan } from '@/services/societeExtendedService';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Couleurs des répartitions : palette des panneaux de travail (lagon / citron / gris), comme Immobilier.
const COLORS = [LAGON_INK, LAGON, CITRON_MID, LAGON_MID, CITRON_INK, LAGON_DEEP, GREY, GREY_LIGHT];

const formatEuro = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;

/** Répartition de la valeur : barre segmentée et légende libellé / montant / part. */
const Repartition = ({ titre, data, total }: { titre: string; data: { name: string; value: number }[]; total: number }) => (
  <div>
    <PanelTitle>{titre}</PanelTitle>
    {total <= 0 ? (
      <p className="mt-3 text-[13px] text-muted-foreground">Aucune société valorisée.</p>
    ) : (
      <>
        <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[1px]">
          {data.filter((d) => d.value > 0).map((d, i) => (
            <div
              key={d.name}
              className="h-full"
              title={`${d.name} · ${((d.value / total) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
              style={{ width: `${(d.value / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
            />
          ))}
        </div>
        <ul className="mt-4 space-y-2.5">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-[13px] font-medium text-foreground">{formatEuro(d.value)}</span>
                <span className="w-12 text-right text-[12px] text-muted-foreground">
                  {((d.value / total) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                </span>
              </span>
            </li>
          ))}
        </ul>
      </>
    )}
  </div>
);

export const SocietesSynthese = () => {
  const { societes, isLoading } = useSocietes();
  const ifiData = useSocietesIFI(societes);
  const transmissionData = useSocietesTransmission(societes);
  // Dernier bilan par société : sert de repli quand les champs "snapshot" de
  // `societes` (onglet Finances) sont vides, pour ne pas afficher des KPI à 0
  // alors que l'utilisateur a saisi ses comptes via l'onglet Bilans.
  const [dernierBilanParSociete, setDernierBilanParSociete] = useState<Record<string, SocieteBilan>>({});

  useEffect(() => {
    societeBilanService.listAllForUser()
      .then(bilans => {
        const latest: Record<string, SocieteBilan> = {};
        for (const b of bilans) {
          const existing = latest[b.societe_id];
          if (!existing || b.exercice_annee > existing.exercice_annee) latest[b.societe_id] = b;
        }
        setDernierBilanParSociete(latest);
      })
      .catch((e) => { if (import.meta.env.DEV) console.error(e); });
  }, []);

  if (isLoading) return <div className="px-8 py-6"><LoadingSpinner /></div>;

  const totalSocietes = societes.length;
  const valeurTotale = societes.reduce((s, c) => s + (c.valeur_estimee || 0), 0);
  const capitalTotal = societes.reduce((s, c) => s + (c.capital_social || 0), 0);
  const tresoTotale = societes.reduce((s, c) => s + ((c as any).tresorerie_disponible || dernierBilanParSociete[c.id]?.tresorerie || 0), 0);
  const ccaTotal = societes.reduce((s, c) => s + ((c as any).compte_courant_associes || 0), 0);
  const caTotal = societes.reduce((s, c) => s + ((c as any).chiffre_affaires || dernierBilanParSociete[c.id]?.chiffre_affaires || 0), 0);
  const resultatTotal = societes.reduce((s, c) => s + ((c as any).resultat_net || dernierBilanParSociete[c.id]?.resultat_net || 0), 0);

  const rentabilite = caTotal > 0 ? (resultatTotal / caTotal * 100) : 0;
  const holdings = societes.filter(s => s.holding && s.holding !== 'Non');

  // Répartitions (valeur estimée)
  const parType: Record<string, number> = {};
  const parRegime: Record<string, number> = {};
  societes.forEach(s => {
    const t = s.type_societe ? getSocieteTypeLabel(s.type_societe, s.forme_societe_civile) : 'Non défini';
    parType[t] = (parType[t] || 0) + (s.valeur_estimee || 0);
    const r = s.regime_fiscal || 'Non défini';
    parRegime[r] = (parRegime[r] || 0) + (s.valeur_estimee || 0);
  });
  const dataType = Object.entries(parType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const dataRegime = Object.entries(parRegime).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Alertes
  const alertes: { type: string; message: string; societe: string }[] = [];
  const moisFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();
  societes.forEach(s => {
    if (s.jour_cloture && s.mois_cloture) {
      const moisIdx = moisFr.indexOf(s.mois_cloture);
      if (moisIdx >= 0) {
        const cloture = new Date(now.getFullYear(), moisIdx, parseInt(s.jour_cloture));
        if (cloture < now) cloture.setFullYear(now.getFullYear() + 1);
        const days = Math.ceil((cloture.getTime() - now.getTime()) / (1000*60*60*24));
        if (days < 60) alertes.push({ type: 'cloture', message: `Clôture dans ${days} jours`, societe: s.denomination });
      }
    }
    if (((s as any).compte_courant_associes || 0) > 50000) alertes.push({ type: 'cca', message: `CCA important : ${((s as any).compte_courant_associes).toLocaleString('fr-FR')} €`, societe: s.denomination });
    const dateB = (s as any).date_dernier_bilan;
    if (!dateB) alertes.push({ type: 'bilan', message: 'Aucun bilan renseigné', societe: s.denomination });
    else {
      const months = (now.getTime() - new Date(dateB).getTime()) / (1000*60*60*24*30);
      if (months > 18) alertes.push({ type: 'bilan', message: `Bilan ancien (${Math.round(months)} mois)`, societe: s.denomination });
    }
  });

  if (totalSocietes === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">
          Aucune société enregistrée : commencez par ajouter vos sociétés dans l'onglet « Mes sociétés ».
        </p>
      </div>
    );
  }

  // Sur le modèle de la Vue d'ensemble Immobilier : valeur et lignes de synthèse à gauche,
  // répartitions de la valeur à droite, puis les alertes en lignes filetées.
  return (
    <>
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <p className="text-[12px] text-muted-foreground">Valeur globale des sociétés</p>
          <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {formatEuro(valeurTotale)}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
            <Chip tone="lagon">{totalSocietes} société{totalSocietes > 1 ? 's' : ''}</Chip>
            <span>dont {holdings.length} holding{holdings.length > 1 ? 's' : ''}</span>
          </p>
          <dl className="mt-5">
            <SummaryRow label="Capital"><span className="tabular-nums">{formatEuro(capitalTotal)}</span></SummaryRow>
            <SummaryRow label="CA cumulé"><span className="tabular-nums">{formatEuro(caTotal)}</span></SummaryRow>
            <SummaryRow label="Rentabilité">
              <span className="tabular-nums">{rentabilite.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">résultat / CA</span>
            </SummaryRow>
            <SummaryRow label="Trésorerie"><span className="tabular-nums">{formatEuro(tresoTotale)}</span></SummaryRow>
            <SummaryRow label="Comptes cour.">
              <span className="tabular-nums">{formatEuro(ccaTotal)}</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">d'associés</span>
            </SummaryRow>
            <SummaryRow label="Valeur IFI">
              <span className="tabular-nums">{formatEuro(ifiData.totalValeurIFI)}</span>
              {ifiData.nombreSocietesExonerees > 0 && (
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">{ifiData.nombreSocietesExonerees} exonérée(s)</span>
              )}
            </SummaryRow>
            <SummaryRow label="Succession">
              <span className="tabular-nums">{formatEuro(transmissionData.totalValeurSuccessorale)}</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">valeur successorale</span>
            </SummaryRow>
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-y-8 px-8 py-6 xl:grid-cols-2 xl:gap-x-10">
          <Repartition titre="Par type de société" data={dataType} total={valeurTotale} />
          <Repartition titre="Par régime fiscal" data={dataRegime} total={valeurTotale} />
        </div>
      </div>

      <section className="border-b border-border px-8 py-6">
        <PanelTitle action={<Chip tone={alertes.length > 0 ? 'alerte' : 'neutral'}>{alertes.length}</Chip>}>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-lagon" />
            Alertes
          </span>
        </PanelTitle>
        {alertes.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Aucune alerte.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {alertes.map((a, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,200px)_1fr] items-center gap-4 py-2.5 text-[13px]">
                <span className="truncate font-medium text-foreground">{a.societe}</span>
                <span className={a.type === 'cca' ? 'text-muted-foreground' : 'text-foreground'}>{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};
