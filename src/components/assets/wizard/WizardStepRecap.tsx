import React from 'react';
import { panelLinkClass } from '@/components/layout/workspace-panel';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { AssetFormValues, getOrigineActifLabel, getOrigineCreanceLabel } from '@/schemas/assetSchema';
import { AssetCharge } from '@/services/assetService';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';
import { WizardStepId } from '@/hooks/useAssetWizard';
import { RenvoisImmobilier, renvoisImmobilier } from '@/components/assets/fields/LocationFields';
import { FRAIS_DETAILLES, hasDetailImmobilier, isRentalPropertyType, estEnLocation } from '@/schemas/immobilierPropertySchema';
import { NATURE_PREVOYANCE_RACHETABLE, isCreance, isPrevoyanceDeces, isPrevoyanceSansRachat } from '@/constants/assetTypes';

interface WizardStepRecapProps {
  form: UseFormReturn<AssetFormValues>;
  charges: AssetCharge[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
  indivisaires: IndivisaireDraft[];
  onEditStep: (stepId: WizardStepId) => void;
}

const formatIndivisaire = (indivisaire: IndivisaireDraft, familyMembers: FamilyMember[]): string => {
  const label = indivisaire.type_indivisaire === 'famille'
    ? (() => {
        const member = familyMembers.find((m) => m.id === indivisaire.family_link_id);
        return member ? (member.prenom ? `${member.prenom} ${member.nom}` : member.nom) : 'Membre de la famille';
      })()
    : (indivisaire.nom_libre || 'Tiers');
  return `${label} (${indivisaire.pourcentage}%)`;
};

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
  { key: 'quantite_millesime', label: 'Quantité / Millésime' },
];

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  // Libellé à gauche, valeur juste à côté (comme les synthèses des panneaux) : lecture en ligne
  // plutôt qu'en deux colonnes écartées sur toute la largeur.
  <div className="grid max-w-2xl grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 sm:grid-cols-[220px_1fr] py-1.5 text-[13px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

const RecapSection: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({ title, onEdit, children }) => (
  <section className="py-4 first:pt-0">
    <div className="mb-2 flex max-w-2xl items-center justify-between">
      <p className="text-[13.5px] font-medium tracking-[-0.01em] text-foreground">{title}</p>
      <Button type="button" variant="link" size="sm" className={`h-auto p-0 ${panelLinkClass}`} onClick={onEdit}>
        Modifier
      </Button>
    </div>
    {children}
  </section>
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

// Étape "Récapitulatif" : lecture seule de tout ce qui a été saisi,
// groupé par étape, avec un lien "Modifier" par section. C'est le seul
// endroit du wizard où le bouton final déclenche réellement la création
// (aucune écriture en base avant ce point).
export const WizardStepRecap: React.FC<WizardStepRecapProps> = ({
  form,
  charges,
  familyData,
  familyMembers,
  demembrements,
  indivisaires,
  onEditStep
}) => {
  const values = form.watch();
  // Contrat de prévoyance : capital garanti repris dans « Valeur », pas d'origine ni de
  // mode de détention, et rappel de ce qui reste à saisir dans Transmission.
  const isPrevoyance = isPrevoyanceDeces(values.nature);
  const estCreance = isCreance(values.nature);
  const detailImmobilier = hasDetailImmobilier(values.nature);

  const chargesAvecImpact = charges
    .map((c) => ({ charge: c, impact: computeImpactMensuel(c) }))
    .filter((c) => c.charge.impact_budget && c.impact !== null);
  const impactMensuelTotal = chargesAvecImpact.reduce((sum, c) => sum + (c.impact || 0), 0);

  const particularitesRenseignees = PARTICULARITES_RECAP_FIELDS
    .map(({ key, label }) => ({ label, value: values[key] }))
    .filter(({ label }) => !(isPrevoyance && label === 'Capital garanti'))
    .filter(({ value }) => value !== undefined && value !== null && value !== '');

  return (
    <div className="divide-y divide-border">
      <RecapSection title="Le bien" onEdit={() => onEditStep('quoi')}>
        <Row label="Nature" value={values.nature || '—'} />
        {values.denomination && <Row label="Dénomination" value={values.denomination} />}
        {detailImmobilier && values.typologie_bien && <Row label="Typologie" value={values.typologie_bien} />}
        {detailImmobilier && values.surface_m2 !== undefined && <Row label="Surface" value={`${values.surface_m2.toLocaleString('fr-FR')} m²`} />}
        {detailImmobilier && values.statut_bien && <Row label="Statut" value={values.statut_bien} />}
      </RecapSection>

      <RecapSection title="Origine et propriété" onEdit={() => onEditStep('origine')}>
        {values.detenteur !== 'Indivision' && formatDate(values.date_acquisition) && <Row label={isPrevoyance ? 'Date de souscription' : estCreance ? 'Date de la créance' : "Date d'acquisition"} value={formatDate(values.date_acquisition)} />}
        {values.detenteur !== 'Indivision' && !isPrevoyance && values.origine_actif?.[0] && <Row label="Origine" value={(estCreance ? getOrigineCreanceLabel : getOrigineActifLabel)(values.origine_actif[0])} />}
        {!isPrevoyance && values.mode_detention && <Row label="Mode de détention" value={values.mode_detention} />}
        {values.detenteur && <Row label="Détenteur / Souscripteur" value={values.detenteur === 'Indivision' ? 'En indivision avec un tiers' : values.detenteur} />}
        {values.detenteur === 'Indivision' && (
          <Row
            label="Co-indivisaires"
            value={indivisaires.length > 0 ? indivisaires.map((i) => formatIndivisaire(i, familyMembers)).join(', ') : '—'}
          />
        )}
        {values.qualification_bien && !isPrevoyanceSansRachat(values.nature) && <Row label="Qualification" value={values.qualification_bien} />}
        {values.detenteur === 'Le couple' && familyData.hasPartner && (
          <Row
            label="Quote-part"
            value={`${values.pourcentage_utilisateur ?? 50}% / ${values.pourcentage_conjoint ?? 50}%`}
          />
        )}
      </RecapSection>

      {(values.valeur_acquisition !== undefined || values.frais_acquisition !== undefined) && (
        <RecapSection title="Prix" onEdit={() => onEditStep('prix')}>
          {values.valeur_acquisition !== undefined && <Row label="Valeur d'achat" value={formatEur(values.valeur_acquisition)} />}
          {detailImmobilier && FRAIS_DETAILLES.map(({ name, label }) => values[name] !== undefined && (
            <Row key={name} label={label} value={formatEur(values[name] as number)} />
          ))}
          {values.frais_acquisition !== undefined && <Row label={detailImmobilier ? 'Total des frais' : "Frais d'acquisition"} value={formatEur(values.frais_acquisition)} />}
          {detailImmobilier && values.finance_par_credit && <Row label="Crédit" value="À saisir dans Passifs après la création" />}
        </RecapSection>
      )}

      {estEnLocation(values) && (
        <RecapSection title="Location" onEdit={() => onEditStep('location')}>
          <Row label={values.nature === 'Immeubles locatifs (meublés)' ? 'Statut du loueur' : 'Type de location'} value={values.type_location || '—'} />
          {values.regime_location && <Row label="Régime fiscal" value={values.regime_location} />}
          {values.loyer_mensuel ? <Row label="Loyer mensuel" value={`${formatEur(values.loyer_mensuel)}${values.loyer_budget ? ' · reporté au budget' : ''}`} /> : null}
        </RecapSection>
      )}

      {(isPrevoyance || values.valeur_estimee !== undefined || formatDate(values.date_estimation)) && (
        <RecapSection title="Valeur" onEdit={() => onEditStep('droitsvaleur')}>
          {isPrevoyance && <Row label="Capital garanti" value={formatEur(values.capital_garanti ?? 0)} />}
          {values.valeur_estimee !== undefined && (
            <Row label={values.nature === NATURE_PREVOYANCE_RACHETABLE ? 'Valeur de rachat' : estCreance ? 'Montant restant dû' : 'Valeur estimée'} value={formatEur(values.valeur_estimee)} />
          )}
          {formatDate(values.date_estimation) && <Row label="Date d'estimation" value={formatDate(values.date_estimation)} />}
        </RecapSection>
      )}

      {particularitesRenseignees.length > 0 && (
        <RecapSection title="Particularités" onEdit={() => onEditStep('particularites')}>
          {particularitesRenseignees.map(({ label, value }) => (
            <Row key={label} label={label} value={String(value)} />
          ))}
        </RecapSection>
      )}

      {!estCreance && <RecapSection title="Charges" onEdit={() => onEditStep('charges')}>
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
      </RecapSection>}

      {isPrevoyance && (
        <div className="py-4">
          <div className="rounded-[2px] border border-border bg-secondary/50 px-4 py-3 text-[13px]">
            <p className="font-medium text-foreground">Reste à faire après la création</p>
            <p className="mt-1 text-muted-foreground">
              Renseignez la clause bénéficiaire et les primes versées dans Transmission → Assurance-vie.
              Sans les primes, le capital transmis au décès ne peut pas être taxé (art. 990 I et 757 B).
            </p>
          </div>
        </div>
      )}

      {renvoisImmobilier(values).length > 0 && (
        <div className="py-4">
          <RenvoisImmobilier titre="Reste à faire après la création" renvois={renvoisImmobilier(values)} />
        </div>
      )}

      <PlusValueBlock form={form} />
      <ValorisationDemembreeBlock form={form} familyData={familyData} familyMembers={familyMembers} demembrements={demembrements} />

    </div>
  );
};
