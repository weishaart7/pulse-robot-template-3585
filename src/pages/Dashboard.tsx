import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashCard, DASH_ACCENT, DASH_INK, DOT_FONT } from '@/components/ui/dash-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { computePatrimoineBreakdown } from '@/components/patrimoine/PatrimoineChart';
import { AlertesConseil } from '@/components/alertes/AlertesConseil';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { useFiscalOverview } from '@/hooks/useFiscalOverview';
import { ChevronRight, Users, Gift, Scale, FileText, Landmark, Hourglass, PiggyBank, CalendarDays, Wallet, type LucideIcon } from 'lucide-react';

function formatEuros(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} €`;
}

// Contenu des cartes de la Vue d'ensemble (Ledgerix × Creator Finance, cf. dash-card.tsx) :
// gros chiffres noirs serrés, « € » réduit et grisé, graphiques en traits fins,
// compteurs en matrice de points, accent lime réservé à l'élément principal.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-[#0d1b1e]/45">{children}</p>;
}

function Figure({ value, size = 40 }: { value: number; size?: number }) {
  return (
    <span className="font-medium leading-none tabular-nums" style={{ fontSize: size, letterSpacing: '-0.05em' }}>
      {value < 0 ? '−' : ''}{Math.round(Math.abs(value)).toLocaleString('fr-FR')}
      <span className="ml-1 text-[0.38em] font-normal text-[#0d1b1e]/40" style={{ letterSpacing: 0 }}>€</span>
    </span>
  );
}

function Row({ label, value, count, dot, muted }: { label: string; value: string; count?: number; dot?: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#0d1b1e]/[0.07] py-2 text-[12px]">
      <span className="flex min-w-0 items-center gap-2.5 text-[#0d1b1e]/60">
        <span className="h-3 w-3 shrink-0 rounded-full border border-[#0d1b1e]/25 p-[2px]">
          {dot && <span className="block h-full w-full rounded-full" style={{ background: dot }} />}
        </span>
        <span className="truncate">{label}</span>
        {count !== undefined && <span className="text-[13px] text-[#0d1b1e]/40" style={DOT_FONT}>{count}</span>}
      </span>
      <span className={`shrink-0 font-medium tabular-nums ${muted ? 'text-[#0d1b1e]/30' : ''}`}>{value}</span>
    </div>
  );
}

// Ligne de catégorie : nom, part, bande « code-barres » de 28 traits dont la part
// remplie suit le poids de la catégorie, puis la valeur. La première passe en lime.
function CategoryStrip({ name, value, pct, lead }: { name: string; value: number; pct: number; lead?: boolean }) {
  const TICKS = 28;
  const filled = Math.max(1, Math.round((pct / 100) * TICKS));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="flex min-w-0 items-baseline gap-2 text-[12px]">
        <span className="truncate">{name}</span>
        <span className="tabular-nums text-[#0d1b1e]/40">{Math.round(pct)} %</span>
      </span>
      <span className="text-[12px] font-medium tabular-nums">{formatEuros(value)}</span>
      <div className="col-span-2 flex h-3 items-end gap-[2px]">
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: i < filled ? '100%' : '45%',
              background: i < filled ? (lead ? DASH_ACCENT : DASH_INK) : 'rgba(13,27,30,0.12)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Jauge en graduations (Ledgerix) : part des charges dans les revenus.
function TickGauge({ ratio, solde }: { ratio: number; solde: number }) {
  const TICKS = 41;
  const filled = Math.round((ratio / 100) * (TICKS - 1));
  return (
    <div className="relative mx-auto w-full max-w-[180px]">
      <svg viewBox="0 0 200 110" className="block w-full">
        {Array.from({ length: TICKS }, (_, i) => {
          const a = Math.PI * (1 - i / (TICKS - 1));
          const r1 = 80, r2 = i === filled ? 98 : 92;
          const on = i <= filled && ratio > 0;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(a)} y1={102 - r1 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)} y2={102 - r2 * Math.sin(a)}
              stroke={i === filled ? DASH_ACCENT : on ? DASH_INK : 'rgba(13,27,30,0.12)'}
              strokeWidth={i === filled ? 3.5 : 2}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-[22px] font-medium leading-none tabular-nums" style={{ letterSpacing: '-0.05em' }}>
          {solde >= 0 ? '+' : '−'}{Math.round(Math.abs(solde)).toLocaleString('fr-FR')}
          <span className="ml-1 text-[12px] font-normal text-[#0d1b1e]/40" style={{ letterSpacing: 0 }}>€</span>
        </div>
        <div className="mt-0.5 text-[10px] text-[#0d1b1e]/45">disponible / mois</div>
      </div>
    </div>
  );
}

// Orbite d'icônes (Creator Finance) pour les modules pas encore branchés.
function Orbit({ center: Center, satellites }: { center: LucideIcon; satellites: LucideIcon[] }) {
  const pos = ['left-1/2 top-0 -translate-x-1/2', 'right-0 top-1/2 -translate-y-1/2', 'left-1/2 bottom-0 -translate-x-1/2', 'left-0 top-1/2 -translate-y-1/2'];
  return (
    <div className="relative mx-auto h-24 w-24">
      <div className="absolute inset-3 rounded-full border border-dashed border-[#0d1b1e]/15" />
      <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#0d1b1e]/[0.08] bg-white">
        <Center className="h-4 w-4" strokeWidth={1.75} />
      </div>
      {satellites.slice(0, 4).map((Icon, i) => (
        <div key={i} className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur ${pos[i]}`}>
          <Icon className="h-3.5 w-3.5 text-[#0d1b1e]/60" strokeWidth={1.75} />
        </div>
      ))}
    </div>
  );
}

function SoonChip() {
  return (
    <div className="mx-auto mt-3 w-fit rounded-xl bg-[#0d1b1e]/80 px-3 py-1.5 text-[10px] text-white backdrop-blur">
      Contenu à venir
    </div>
  );
}

const Dashboard = () => {
  const {
    revenus
  } = useRevenus();
  const {
    charges
  } = useCharges();
  const {
    assets
  } = useAssets();
  const {
    passifs
  } = usePassifs();
  const {
    emprunts
  } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  const [assetDemembrements, setAssetDemembrements] = useState<AssetDemembrement[]>([]);
  const { impot, prelevementsSociauxCapitauxMobiliers, prelevementsSociauxPensionsRetraitesRentes, prelevementsSociauxGainsActionnariat } = useFiscalOverview();

  // Même calcul que FiscalOverviewCard.tsx (module Fiscalité) : IFI et prélèvements
  // sociaux sur les salaires non inclus, seules les impositions effectivement calculées sont sommées.
  const impositionTotale = impot.impotNet
    + prelevementsSociauxCapitauxMobiliers.prelevementsSociaux
    + prelevementsSociauxPensionsRetraitesRentes.prelevementsSociaux
    + prelevementsSociauxGainsActionnariat.prelevementsSociaux;

  useEffect(() => {
    assetDemembrementService.getAllForUser()
      .then(setAssetDemembrements)
      .catch(() => {
        setAssetDemembrements([]);
        toast.error("Impossible de charger les démembrements");
      });
  }, []);
  // Convertir un montant en annuel selon sa périodicité (logique reprise de BudgetList.tsx)
  const toAnnual = (amount: number | undefined, periodicite: string | undefined): number => {
    if (!amount) return 0;
    const p = (periodicite || 'mensuel').toLowerCase();
    switch (p) {
      case 'mensuel':
      case 'mensuelle':
        return amount * 12;
      case 'trimestriel':
      case 'trimestrielle':
        return amount * 4;
      case 'semestriel':
      case 'semestrielle':
        return amount * 2;
      case 'annuel':
      case 'annuelle':
      case 'ponctuel':
        return amount;
      default:
        return amount * 12; // Par défaut mensuel
    }
  };

  const totalRevenus = revenus.reduce((sum, revenu) => sum + toAnnual(revenu.montant, revenu.periodicite), 0) / 12;
  const totalCharges = charges.reduce((sum, charge) => sum + toAnnual(charge.montant, charge.periodicite), 0) / 12;
  const soldeMensuel = totalRevenus - totalCharges;
  const ratioCharges = totalRevenus > 0 ? Math.min(100, (totalCharges / totalRevenus) * 100) : 0;

  const repartition = computePatrimoineBreakdown(assets, passifs, emprunts, assetDemembrements, { familyProfile, maritalStatus, familyLinks });
  const actifs = repartition.filter(item => item.type === 'actif' && item.value > 0);
  const totalActifs = actifs.reduce((sum, item) => sum + item.value, 0);
  const totalPassifs = repartition.filter(item => item.type === 'passif').reduce((sum, item) => sum + item.value, 0);
  const patrimoineNet = totalActifs - totalPassifs;

  return <div className="p-6 pt-0">
      <AlertesConseil />

      <div className="mb-6 rounded-3xl p-8" style={{ backgroundColor: '#006064', boxShadow: 'none' }}>
        <div className="flex justify-end items-start">
          <div className="max-w-md">
            <h3 className="font-medium mb-2.5 text-white" style={{ fontSize: '14px' }}>Parlez avec un expert</h3>
            <p className="mb-4 leading-relaxed text-white/70" style={{ fontSize: '12px' }}>
              Notre équipe interne de conseillers financiers, de conseillers patrimoniaux et partenaires est à vos côtés pour vous accompagner sereinement, qu'il s'agisse de questions simples ou de décisions stratégiques.
            </p>
            <button
              className="inline-flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide px-2.5 py-1 hover:opacity-85 transition-opacity duration-200 group"
              style={{ backgroundColor: '#ffffff', color: '#006064' }}
            >
              Planifier un rendez-vous
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={3.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard title="Patrimoine" to="/dashboard/patrimoine" tag="Aujourd'hui" meta={{ count: actifs.length, label: actifs.length > 1 ? 'catégories d\'actifs' : 'catégorie d\'actifs' }} className="sm:col-span-2">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex flex-col justify-between gap-4">
              <div>
                <Eyebrow>Patrimoine net</Eyebrow>
                <div className="mt-2"><Figure value={patrimoineNet} /></div>
              </div>
              {/* Info-bulle dépolie actifs / passifs */}
              <div className="w-fit rounded-2xl border border-[#0d1b1e]/[0.08] bg-white/65 px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-[#0d1b1e]/50">Actifs</span>
                  <span className="font-medium tabular-nums">{formatEuros(totalActifs)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-6">
                  <span className="text-[#0d1b1e]/50">Passifs</span>
                  <span className={`font-medium tabular-nums ${totalPassifs === 0 ? 'text-[#0d1b1e]/30' : ''}`}>
                    {totalPassifs > 0 ? `− ${formatEuros(totalPassifs)}` : formatEuros(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {actifs.length === 0
                ? <p className="text-[12px] text-[#0d1b1e]/45">Ajoutez vos actifs pour voir leur répartition.</p>
                : actifs.slice(0, 4).map((item, i) => (
                  <CategoryStrip key={item.name} name={item.name} value={item.value} pct={(item.value / totalActifs) * 100} lead={i === 0} />
                ))}
              {actifs.length > 4 && (
                <p className="text-[11px] text-[#0d1b1e]/40">+ {actifs.length - 4} autre{actifs.length - 4 > 1 ? 's' : ''} catégorie{actifs.length - 4 > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </DashCard>

        <DashCard title="Budget" to="/dashboard/budget" tag="Par mois" meta={{ count: revenus.length + charges.length, label: 'lignes de budget' }}>
          <TickGauge ratio={ratioCharges} solde={soldeMensuel} />
          <div className="mt-3">
            <Row dot={DASH_ACCENT} label="Revenus" value={formatEuros(totalRevenus)} />
            <Row dot={DASH_INK} label="Charges" value={formatEuros(totalCharges)} />
          </div>
        </DashCard>

        <DashCard title="Fiscalité" to="/dashboard/fiscalite" tag="Estimation">
          <Eyebrow>Imposition totale</Eyebrow>
          <div className="mt-2"><Figure value={impositionTotale} size={30} /></div>
          <div className="mt-3">
            <Row dot={DASH_ACCENT} label="IR et Prélèvements sociaux" value={formatEuros(impositionTotale)} />
            <Row label="IFI" value={formatEuros(0)} muted />
            <Row label="Autres impôts" value={formatEuros(0)} muted />
          </div>
        </DashCard>

        <DashCard title="Transmission" to="/dashboard/transmission" variant="deep">
          <Orbit center={Users} satellites={[Gift, Scale, FileText, Landmark]} />
          <SoonChip />
        </DashCard>

        <DashCard title="Retraite" to="/dashboard/retraite" variant="deep">
          <Orbit center={Hourglass} satellites={[PiggyBank, CalendarDays, Landmark, Wallet]} />
          <SoonChip />
        </DashCard>
      </div>
    </div>;
};
export default Dashboard;