import React from 'react';
import { Landmark, Receipt } from 'lucide-react';
import { Chip, PanelTitle, WorkspaceHeader, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { BackButton } from '@/components/patrimoine/PatrimoinePanel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { Emprunt, Passif } from '@/services/passifService';
import { Asset } from '@/services/assetService';
import { formatCurrency, mapDetenteurToDisplay } from '@/lib/patrimoine/utils';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { hasConjoint } from '@/lib/family/maritalStatus';
import { estimateEmpruntFin } from '@/lib/budget/emprunts';
import { construireTableau, contratDepuisEmprunt } from '@/lib/credit/contrat';
import { AmortissementSection } from '@/components/patrimoine/AmortissementSection';

interface PassifDetailViewProps {
  item: Emprunt | Passif;
  assets?: Asset[];
  onBack: () => void;
  onEdit: () => void;
}

const isEmprunt = (p: Emprunt | Passif): p is Emprunt => 'libelle' in p && 'capital_restant_du' in p;

const eur = (v: number | null | undefined) => (v == null ? null : formatCurrency(v));
const pct = (v: number | null | undefined) => (v == null ? null : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`);
const date = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('fr-FR') : null);

// Ligne libellé / valeur ; masquée si la valeur n'est pas renseignée.
function Row({ label, value, compact }: { label: string; value: React.ReactNode; compact?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <div className={compact
      ? 'grid grid-cols-[130px_1fr] gap-3 py-1.5 text-[13px]'
      : 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-1.5 text-[13px] sm:grid-cols-[200px_1fr]'}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0">
      <SectionHeader title={title} />
      <dl className="max-w-2xl">{children}</dl>
    </section>
  );
}

// Fiche d'un emprunt ou d'une dette en « panneau de travail » : informations à gauche, synthèse
// à droite (≥ lg). Les projections reprennent les estimations de l'ancienne fiche modale.
export const PassifDetailView: React.FC<PassifDetailViewProps> = ({ item, assets = [], onBack, onEdit }) => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const familyInfo = {
    hasPartner: hasConjoint(maritalStatus),
    userFirstName: familyProfile?.prenom || '',
    partnerFirstName: hasConjoint(maritalStatus) ? maritalStatus.prenom_conjoint : '',
  };
  const detenteur = item.detenteur ? mapDetenteurToDisplay(item.detenteur, familyInfo) : null;

  const emprunt = isEmprunt(item) ? item : null;
  const dette = emprunt ? null : (item as Passif);
  const linkedAsset = emprunt?.asset_id ? assets.find((a) => a.id === emprunt.asset_id) : undefined;
  const titre = emprunt ? (emprunt.libelle || emprunt.nature) : dette!.nature;

  // Contrat complet : tableau d'amortissement, il fait foi (capital restant dû, fin, coût).
  const contrat = emprunt ? contratDepuisEmprunt(emprunt) : null;
  const tableau = contrat ? construireTableau(contrat) : null;

  // Sans contrat : projections estimées depuis la saisie manuelle (cf. docs/patrimoine.md R4 / P2).
  let projection: { totalRestant: number | null; coutInterets: number | null; inFine: boolean } | null = null;
  if (!tableau && emprunt?.mensualite && emprunt.duree_restante) {
    const inFine = emprunt.mode_amortissement === 'In fine';
    const totalMensualites = emprunt.mensualite * emprunt.duree_restante;
    const crd = emprunt.capital_restant_du;
    const totalRestant = inFine ? (crd != null ? totalMensualites + crd : null) : totalMensualites;
    const coutInterets = inFine ? totalMensualites : (crd != null ? totalMensualites - crd : null);
    projection = { totalRestant, coutInterets: coutInterets !== null && coutInterets >= 0 ? coutInterets : null, inFine };
  }
  const fin = emprunt && !tableau ? estimateEmpruntFin(emprunt.updated_at, emprunt.duree_restante) : undefined;

  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader
        icon={emprunt ? <Landmark strokeWidth={1.75} /> : <Receipt strokeWidth={1.75} />}
        trail={['Patrimoine', 'Passifs', titre]}
        actions={
          <>
            <BackButton onClick={onBack} />
            <button type="button" onClick={onEdit} className={panelPrimaryButtonClass}>Modifier</button>
          </>
        }
      />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{titre}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          {emprunt?.libelle ? emprunt.nature : emprunt ? 'Emprunt' : 'Dette'}
          {emprunt?.societe_id && <Chip>Société · hors totaux</Chip>}
        </p>
      </div>

      <div className="grid border-t border-border lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="divide-y divide-border px-8 py-6 lg:border-r lg:border-border">
          {emprunt ? (
            <>
              <Section title="Le prêt">
                <Row label="Nature" value={emprunt.nature} />
                <Row label="Actif financé / garanti" value={linkedAsset ? (linkedAsset.denomination || linkedAsset.nature) : null} />
                <Row label="Date de souscription" value={date(emprunt.date_souscription)} />
                <Row label="Capital restant dû" value={eur(emprunt.capital_restant_du)} />
                <Row label="Durée restante" value={emprunt.duree_restante != null ? `${emprunt.duree_restante} mois` : null} />
                <Row label="Taux d'intérêt" value={pct(emprunt.taux_interet)} />
                <Row label="Mensualité" value={eur(emprunt.mensualite)} />
              </Section>
              <Section title="Conditions de l'offre">
                <Row label="Capital emprunté" value={eur(emprunt.capital_initial)} />
                <Row label="Première échéance" value={date(emprunt.date_premiere_echeance)} />
                <Row label="Durée totale" value={emprunt.duree_totale_mois ? `${emprunt.duree_totale_mois} mois` : null} />
                <Row label="Différé" value={emprunt.differe_mois ? `${emprunt.differe_mois} mois (${emprunt.differe_type === 'total' ? 'total' : 'partiel'})` : null} />
                <Row label="Mode d'amortissement" value={emprunt.mode_amortissement} />
                <Row label="Type de taux" value={emprunt.type_taux} />
                <Row label="TAEG" value={pct(emprunt.taeg)} />
                <Row label="Coût total (offre)" value={eur(emprunt.cout_total_credit)} />
                <Row label="Frais de dossier" value={eur(emprunt.frais_dossier)} />
                <Row label="Frais de garantie" value={eur(emprunt.frais_garantie)} />
              </Section>
              <AmortissementSection emprunt={emprunt} onEdit={onEdit} />
              <Section title="Garantie et assurance">
                <Row label="Type de garantie" value={emprunt.type_garantie || 'Aucune'} />
                <Row label="Assurance emprunteur" value={emprunt.assure ? 'Oui' : 'Non'} />
                {emprunt.assure && (
                  <>
                    <Row label="Quotité assurée (vous)" value={pct(emprunt.quotite_assuree_utilisateur)} />
                    <Row label="Quotité assurée (conjoint)" value={pct(emprunt.quotite_assuree_conjoint)} />
                    <Row label="Capital garanti au décès" value={eur(emprunt.capital_garanti_deces)} />
                    <Row label="Coût de l'assurance" value={emprunt.assurance_mode && emprunt.assurance_valeur != null
                      ? emprunt.assurance_mode === 'montant'
                        ? `${eur(emprunt.assurance_valeur)} / mois`
                        : `${pct(emprunt.assurance_valeur)} par an sur le ${emprunt.assurance_mode === 'taux_crd' ? 'capital restant dû' : 'capital initial'}`
                      : null} />
                  </>
                )}
              </Section>
              <Section title="Détention">
                <Row label="Détenteur" value={detenteur} />
                <Row label="Qualification" value={emprunt.qualification_bien} />
                <Row label="Reporté au budget" value={emprunt.reporter_budget ? 'Oui' : 'Non'} />
              </Section>
            </>
          ) : (
            <>
              <Section title="La dette">
                <Row label="Nature" value={dette!.nature} />
                <Row label="Date de souscription" value={date(dette!.date_souscription)} />
                <Row label="Montant dû" value={eur(dette!.montant_du)} />
              </Section>
              <Section title="Détention">
                <Row label="Détenteur" value={detenteur} />
                <Row label="Qualification" value={dette!.qualification_bien} />
              </Section>
            </>
          )}
        </div>

        <aside className="border-t border-border px-8 py-6 lg:border-t-0">
          <div className="lg:sticky lg:top-6">
            <PanelTitle>Synthèse</PanelTitle>
            <p className="mt-4 text-[12px] text-muted-foreground">
              {emprunt ? (tableau ? `Capital restant dû au ${new Date().toLocaleDateString('fr-FR')} · calculé` : 'Capital restant dû') : 'Montant dû'}
            </p>
            <p className="mt-1 text-[28px] font-medium leading-none tracking-[-0.02em] tabular-nums">
              {eur(emprunt ? emprunt.capital_restant_du : dette!.montant_du) ?? '—'}
            </p>
            {emprunt && (
              <dl className="mt-5 border-t border-border pt-3">
                <Row compact label="Mensualité" value={eur(emprunt.mensualite)} />
                <Row compact label={tableau ? 'Dernière échéance' : 'Fin estimée'} value={tableau ? tableau.dateFin.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : date(fin)} />
                {tableau && (
                  <>
                    <Row compact label="Coût total" value={eur(tableau.coutTotal)} />
                    <Row compact label="dont intérêts" value={eur(tableau.totalInterets)} />
                  </>
                )}
                {projection && (
                  <>
                    <Row compact label="Reste à rembourser" value={eur(projection.totalRestant)} />
                    <Row compact label="Intérêts restants" value={eur(projection.coutInterets)} />
                  </>
                )}
              </dl>
            )}
            {projection?.coutInterets != null && (
              <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
                {projection.inFine
                  ? "Estimation : intérêts constants jusqu'à l'échéance, capital remboursé en une fois, hors variation de taux et remboursement anticipé."
                  : 'Estimation : mensualité constante sur la durée restante, hors variation de taux et remboursement anticipé.'}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
