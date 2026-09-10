import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { AssetFormValues } from '@/schemas/assetSchema';
import { AssetCharge } from '@/services/assetService';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';
import { WizardStepId } from '@/hooks/useAssetWizard';

interface WizardStep6RecapProps {
  form: UseFormReturn<AssetFormValues>;
  charges: AssetCharge[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
  onEditStep: (stepId: WizardStepId) => void;
  onValidate: () => void;
  isSubmitting: boolean;
}

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: unknown) => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d as string);
  return isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('fr-FR').format(date);
};

// Champs de l'étape "Particularités" à reprendre en lecture seule dans le
// récapitulatif : ce sont les champs les plus fréquemment renseignés parmi
// ceux, très nombreux et conditionnés à la nature, de CaracteristiquesFields.
// Une valeur non renseignée n'apparaît simplement pas — pas de reproduction
// des conditions d'affichage par nature, déjà portées par ce composant.
const PARTICULARITES_RECAP_FIELDS: { key: keyof AssetFormValues; label: string }[] = [
  { key: 'etablissement', label: 'Établissement / Gestionnaire' },
  { key: 'capital_garanti', label: 'Capital garanti' },
  { key: 'beneficiaire_designe', label: 'Bénéficiaire désigné' },
  { key: 'mode_sortie', label: 'Mode de sortie' },
  { key: 'taux_remuneration', label: 'Taux de rémunération' },
  { key: 'plafond_verse', label: 'Montant versé' },
  { key: 'duree_blocage', label: 'Durée de blocage' },
  { key: 'montant_engage', label: 'Montant engagé' },
  { key: 'montant_appele', label: 'Montant appelé' },
  { key: 'sous_jacent', label: 'Sous-jacent' },
  { key: 'lieu_stockage', label: 'Lieu de stockage' },
  { key: 'quantite', label: 'Quantité' },
  { key: 'numero_serie', label: 'Numéro de série' },
  { key: 'quantite_millesime', label: 'Quantité / Millésime' },
];

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground text-right">{value}</span>
  </div>
);

const RecapSection: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({ title, onEdit, children }) => (
  <div className="rounded-md border border-border/60 p-4 space-y-1">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onEdit}>
        Modifier
      </Button>
    </div>
    {children}
  </div>
);

const computeImpactMensuel = (charge: AssetCharge): number | null => {
  if (charge.unite !== '€' || !charge.montant || charge.montant <= 0) return null;
  switch (charge.periodicite) {
    case 'mensuelle': return charge.montant;
    case 'trimestrielle': return charge.montant / 3;
    case 'annuelle': return charge.montant / 12;
    default: return null;
  }
};

// Étape 6 — "Récapitulatif" : lecture seule de tout ce qui a été saisi,
// groupé par étape, avec un lien "Modifier" par section. C'est le seul
// endroit du wizard où le bouton final déclenche réellement la création
// (aucune écriture en base avant ce point).
export const WizardStep6Recap: React.FC<WizardStep6RecapProps> = ({
  form,
  charges,
  familyData,
  familyMembers,
  demembrements,
  maritalContext,
  onEditStep,
  onValidate,
  isSubmitting
}) => {
  const values = form.watch();

  const chargesAvecImpact = charges
    .map((c) => ({ charge: c, impact: computeImpactMensuel(c) }))
    .filter((c) => c.charge.impact_budget && c.impact !== null);
  const impactMensuelTotal = chargesAvecImpact.reduce((sum, c) => sum + (c.impact || 0), 0);

  const particularitesRenseignees = PARTICULARITES_RECAP_FIELDS
    .map(({ key, label }) => ({ label, value: values[key] }))
    .filter(({ value }) => value !== undefined && value !== null && value !== '');

  return (
    <div className="space-y-4">
      <RecapSection title="Quoi" onEdit={() => onEditStep('quoi')}>
        <Row label="Nature" value={values.nature || '—'} />
        {values.denomination && <Row label="Dénomination" value={values.denomination} />}
        {values.valeur_estimee !== undefined && <Row label="Valeur estimée" value={formatEur(values.valeur_estimee)} />}
        {formatDate(values.date_estimation) && <Row label="Date d'estimation" value={formatDate(values.date_estimation)} />}
      </RecapSection>

      <RecapSection title="À qui appartient-il" onEdit={() => onEditStep('detention')}>
        {values.mode_detention && <Row label="Mode de détention" value={values.mode_detention} />}
        {values.detenteur && <Row label="Détenteur / Souscripteur" value={values.detenteur} />}
        {values.detenteur === 'Le couple' && familyData.hasPartner && (
          <Row
            label="Quote-part"
            value={`${values.pourcentage_utilisateur ?? 50}% / ${values.pourcentage_conjoint ?? 50}%`}
          />
        )}
        {values.detenteur === 'Indivision' && (
          <Row label="Co-indivisaires" value={`${familyMembers.length ? 'voir détail' : ''} (${demembrements.length} contrepartie(s))`.trim() || '—'} />
        )}
      </RecapSection>

      {values.detenteur !== 'Indivision' && values.valeur_acquisition !== undefined && (
        <RecapSection title="D'où vient-il" onEdit={() => onEditStep('origine')}>
          {formatDate(values.date_acquisition) && <Row label="Date d'acquisition" value={formatDate(values.date_acquisition)} />}
          {values.origine_actif?.[0] && <Row label="Origine" value={values.origine_actif[0]} />}
          {values.valeur_acquisition !== undefined && <Row label="Valeur d'achat" value={formatEur(values.valeur_acquisition)} />}
          {values.frais_acquisition !== undefined && <Row label="Frais d'acquisition" value={formatEur(values.frais_acquisition)} />}
          {values.qualification_bien && <Row label="Qualification" value={values.qualification_bien} />}
        </RecapSection>
      )}

      {particularitesRenseignees.length > 0 && (
        <RecapSection title="Particularités" onEdit={() => onEditStep('particularites')}>
          {particularitesRenseignees.map(({ label, value }) => (
            <Row key={label} label={label} value={String(value)} />
          ))}
        </RecapSection>
      )}

      <RecapSection title="Charges" onEdit={() => onEditStep('charges')}>
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune charge ajoutée</p>
        ) : (
          <>
            {charges.map((c) => (
              <Row key={c.id} label={c.denomination} value={`${c.montant} ${c.unite} (${c.periodicite})`} />
            ))}
            {impactMensuelTotal > 0 && (
              <Row label="Impact budgétaire mensuel total" value={`+${Math.round(impactMensuelTotal)} €/mois`} />
            )}
          </>
        )}
      </RecapSection>

      <PlusValueBlock form={form} />
      <ValorisationDemembreeBlock form={form} familyData={familyData} familyMembers={familyMembers} demembrements={demembrements} />

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={onValidate} disabled={isSubmitting}>
          {isSubmitting ? 'Création en cours...' : 'Valider et créer l\'actif'}
        </Button>
      </div>
    </div>
  );
};
