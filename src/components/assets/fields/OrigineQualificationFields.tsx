import React, { useState } from 'react';
import { panelLinkClass } from '@/components/layout/workspace-panel';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetFormValues, ORIGINE_ACTIF_OPTIONS, ORIGINE_CREANCE_OPTIONS, getOrigineActifLabel } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION, NATURES_DATE_OUVERTURE, getAssetCategory, isCreance, isPEA, isCTO, isNonCote, isDefiscalisation, isFondsCI, isActionnariatSalarie, isPrevoyanceDeces, isPrevoyanceSansRachat } from '@/constants/assetTypes';
import { QUALIFICATION_OPTIONS, isRegimeCommunautaire, isInCouple } from '@/lib/patrimoine/qualification';
import { MaritalContext } from '@/hooks/useAssetForm';
import { FieldHelp } from '@/components/ui/field-help';
import type { FamilyInfo } from '@/lib/patrimoine/utils';
import { OptionToggle } from '@/components/ui/option-toggle';
import { hasDetailImmobilier } from '@/schemas/immobilierPropertySchema';
import { FraisDetaillesFields } from './BienImmobilierFields';
import { RequiredMark } from '@/components/ui/required-mark';

// Sections du bloc Origine : "origine" = date, origine et clauses qui
// déterminent la qualification (entrée/exclusion de communauté, remploi, bien
// propre par nature) ; "prix" = valeur d'achat, frais et financement mixte
// (dont le prix est une entrée) ; "complet" = les deux, dans l'ordre de
// l'onglet Propriété d'AssetForm.tsx.
export type OrigineSection = 'complet' | 'origine' | 'prix';

interface OrigineFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
  section?: OrigineSection;
}

// Bloc "Origine" de l'onglet Propriété (AssetForm.tsx) : date, origine, prix,
// frais et clauses matrimoniales. Exposé séparément de la qualification, et
// scindable en deux sections, pour pouvoir le répartir sur des étapes
// distinctes du wizard.
export const OrigineFields: React.FC<OrigineFieldsProps> = ({ form, maritalContext, section = 'complet' }) => {
  const showOrigineSection = section !== 'prix';
  const showPrixSection = section !== 'origine';
  const watchedNature = form.watch('nature');
  const watchedTypeFonds = form.watch('type_fonds');
  const watchedDetenteur = form.watch('detenteur');
  const watchedOrigineActif = form.watch('origine_actif');
  const watchedClauseRemploi = form.watch('clause_remploi');

  // Créance : pas de prix, mais date et origine demandées (elles fixent sa qualification).
  const estCreance = isCreance(watchedNature);
  const hideAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature) && !estCreance;
  const origineOptions = estCreance ? ORIGINE_CREANCE_OPTIONS : ORIGINE_ACTIF_OPTIONS;
  const isDateOuverture = NATURES_DATE_OUVERTURE.includes(watchedNature);
  // CTO / PEA ouvert avant le mariage en communauté : les titres d'origine restent propres, mais
  // les versements ultérieurs de fonds communs ouvrent une récompense (art. 1433), non calculée ici.
  const watchedDateAcquisition = form.watch('date_acquisition');
  const showAideRecompense = (isCTO(watchedNature) || isPEA(watchedNature))
    && isRegimeCommunautaire(maritalContext.regimeMatrimonial)
    && !!watchedDateAcquisition && !!maritalContext.dateMariage
    && new Date(watchedDateAcquisition) < new Date(maritalContext.dateMariage);
  // Contrat de prévoyance : souscrit, ni acheté ni reçu — seule la date de souscription est
  // demandée (date_acquisition, lue comme telle par useAVContracts), sans origine ni clauses.
  const isPrevoyance = isPrevoyanceDeces(watchedNature);
  // Actionnariat salarié : droit attribué, ni acheté ni reçu — seule la date d'attribution est
  // demandée (date_acquisition), sans origine, prix ni clauses ; qualification automatique.
  const isAS = isActionnariatSalarie(watchedNature);
  const sansOrigine = isPrevoyance || isAS;
  // Résidence ou bien locatif : frais détaillés à la place du champ global (cf. FraisDetaillesFields).
  const fraisDetailles = hasDetailImmobilier(watchedNature);
  const isIndivisionHorsCouple = watchedDetenteur === 'Indivision';
  const showClauseEntreeCommunaute = !sansOrigine && (watchedOrigineActif || []).includes('Donation') || (watchedOrigineActif || []).includes('Héritage');
  // Sous communauté universelle (art. 1526) ou, pour un bien meuble
  // uniquement, sous communauté de meubles et acquêts (art. 1498 al. 1), une
  // libéralité tombe dans la communauté PAR DÉFAUT — la case représente alors
  // une clause d'exclusion (l'inverse de son sens sous régime légal, où elle
  // représente une clause d'entrée, art. 1405 al. 2). Un immeuble sous
  // communauté de meubles et acquêts suit toujours la règle du régime légal.
  // Voir qualification.ts.
  const regimeLower = (maritalContext.regimeMatrimonial || '').toLowerCase();
  const isCommunauteUniverselleRegime = regimeLower.includes('universelle');
  const isCommunauteMeublesAcquetsRegime = regimeLower.includes('meubles') && regimeLower.includes('acquêts');
  const isImmeubleActif = getAssetCategory(watchedNature) === 'actifs immobiliers';
  const inverseSensClause = isCommunauteUniverselleRegime || (isCommunauteMeublesAcquetsRegime && !isImmeubleActif);
  // Clause de remploi : proposée pour un achat, et pour un échange (le bien
  // reçu en échange d'un bien propre reste propre, subrogation réelle,
  // art. 1407). Le moteur (qualifierBien) applique la clause quelle que soit
  // l'origine.
  const isAchat = (watchedOrigineActif || []).includes('Acquisition à titre onéreux');
  const isEchange = (watchedOrigineActif || []).includes('Échange');
  const showClauseRemploi = !sansOrigine && (isAchat || isEchange);
  // Libellés du prix selon l'origine : « valeur d'achat » n'a pas de sens pour un bien créé ou reçu.
  const origine = (watchedOrigineActif || [])[0];
  const libellesPrix = origine === 'Création'
    ? {
        valeur: 'Montant des apports / coût de création',
        aide: "Société créée : apports au capital (en numéraire ou en nature), qui forment le prix de revient des parts. Œuvre ou brevet : coût engagé, 0 s'il n'y en a pas.",
        frais: 'Frais de constitution',
        aideFrais: "Greffe, annonce légale, rédaction des statuts, droits d'enregistrement des apports, etc.",
      }
    : origine === 'Découverte'
      ? { valeur: 'Valeur à la découverte', aide: 'Valeur du bien au jour de sa découverte.', frais: 'Frais', aideFrais: 'Frais éventuels (expertise, etc.).' }
      : origine === 'Échange'
        ? { valeur: 'Valeur du bien reçu', aide: "Valeur du bien reçu en échange, soulte comprise.", frais: "Frais d'acquisition", aideFrais: "Notaire, droits d'enregistrement, etc." }
        : isDefiscalisation(watchedNature) || (isFondsCI(watchedNature) && watchedTypeFonds !== 'fcpr_fpci')
          ? { valeur: 'Montant souscrit', aide: "Sommes versées à la souscription, base de la réduction d'impôt.", frais: "Droits d'entrée", aideFrais: "Droits d'entrée prélevés à la souscription, le cas échéant." }
        : isNonCote(watchedNature) || isFondsCI(watchedNature)
          ? { valeur: 'Montant appelé', aide: 'Sommes effectivement versées au fonds ou à la société (hors engagement restant à appeler).', frais: 'Frais de souscription', aideFrais: "Droits d'entrée ou frais de structuration, le cas échéant." }
        : isCTO(watchedNature)
          ? { valeur: 'Montant investi', aide: 'Prix de revient des titres en portefeuille (versements nets des retraits).', frais: "Frais d'acquisition", aideFrais: 'Frais de courtage et droits de garde capitalisés, le cas échéant.' }
        : isPEA(watchedNature)
          ? { valeur: 'Montant versé', aide: 'Total des versements effectués sur le plan depuis son ouverture, hors gains.', frais: 'Frais sur versements', aideFrais: "Droits d'entrée ou frais prélevés sur les versements, le cas échéant." }
        : origine && origine !== 'Acquisition à titre onéreux'
          ? { valeur: 'Valeur à la réception', aide: "Valeur retenue dans l'acte de donation ou la déclaration de succession.", frais: "Frais d'acquisition", aideFrais: "Frais d'acte ou droits payés à la réception." }
          : { valeur: "Prix d'achat", aide: "Prix payé à l'achat.", frais: "Frais d'acquisition", aideFrais: "Notaire, agence, droits d'enregistrement, etc." };
  const showEstPropreParNature = !sansOrigine && !estCreance && isInCouple(maritalContext.statutCouple);
  // Financement mixte (art. 1436) : ne se pose qu'en régime communautaire,
  // pour un achat (pas un échange), et n'a plus de sens si le remploi total
  // est déjà acté (clause_remploi couvre alors la totalité du prix).
  const showFinancementMixte = isRegimeCommunautaire(maritalContext.regimeMatrimonial)
    && isAchat
    && !watchedClauseRemploi;

  const origineContent = isIndivisionHorsCouple && showOrigineSection ? (
    <div className="rounded-[2px] border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
      Sans effet pour un bien en indivision hors couple
      <FieldHelp>
        La qualification est directement "Indivision", quels que soient l'origine et les clauses éventuelles.
      </FieldHelp>
    </div>
  ) : hideAcquisition ? (
    <div className="text-center py-8 text-muted-foreground">
      Non applicable pour ce type d'actif.
    </div>
  ) : (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showOrigineSection && (
          <>
            <FormField control={form.control} name="date_acquisition" render={({ field }) => (
              <FormItem>
                <FormLabel>{isPrevoyance ? 'Date de souscription' : isAS ? "Date d'attribution" : estCreance ? 'Date de la créance' : isDateOuverture ? "Date d'ouverture" : (isNonCote(watchedNature) || isDefiscalisation(watchedNature) || isFondsCI(watchedNature)) ? 'Date de souscription' : "Date d'acquisition"}<RequiredMark /></FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                {showAideRecompense && (
                  <FieldHelp>
                    Ouvert avant le mariage : s'il a ensuite été alimenté par des revenus communs, saisissez la récompense due à la communauté dans Récompenses.
                  </FieldHelp>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {!sansOrigine && <FormField control={form.control} name="origine_actif" render={({ field }) => (
              <FormItem>
                <FormLabel>{estCreance ? 'Origine de la créance' : "Origine de l'actif"}<RequiredMark /></FormLabel>
                <Select
                  onValueChange={(value) => field.onChange([value])}
                  value={field.value?.[0] || 'Acquisition à titre onéreux'}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir l'origine de l'actif" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {origineOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                    {/* Valeur retirée de la liste mais encore portée par un actif existant. */}
                    {field.value?.[0] && !origineOptions.some((option) => option.value === field.value?.[0]) && (
                      <SelectItem value={field.value[0]}>{getOrigineActifLabel(field.value[0])}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />}
          </>
        )}

        {showPrixSection && !sansOrigine && !estCreance && (
          <>
            <FormField control={form.control} name="valeur_acquisition" render={({ field }) => (
              <FormItem>
                <FormLabel>{libellesPrix.valeur}<RequiredMark /></FormLabel>
                <FieldHelp>{libellesPrix.aide} Sert de base pour le calcul de la plus-value.</FieldHelp>
                <FormControl>
                  <EuroInput className="bg-background border-border shadow-none" type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {!fraisDetailles && <FormField control={form.control} name="frais_acquisition" render={({ field }) => (
              <FormItem>
                <FormLabel>{libellesPrix.frais}</FormLabel>
                <FieldHelp>{libellesPrix.aideFrais}</FieldHelp>
                <FormControl>
                  <EuroInput className="bg-background border-border shadow-none" type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />}
          </>
        )}
      </div>

      {/* Clauses : options compactes sur une ligne, à la place de cases à cocher isolées. */}
      {showOrigineSection && (showClauseEntreeCommunaute || showClauseRemploi || showEstPropreParNature) && (
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Clauses</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {showClauseEntreeCommunaute && (
              <FormField control={form.control} name="clause_entree_communaute" render={({ field }) => (
                <OptionToggle
                  checked={!!field.value}
                  onChange={field.onChange}
                  help={<FieldHelp>
                    {inverseSensClause
                      ? "Par défaut, une donation ou succession reçue pendant le mariage tombe dans la communauté (art. 1526, ou art. 1498 al. 1 pour un bien meuble sous communauté de meubles et acquêts). Activez si une clause réserve ce bien à l'époux bénéficiaire."
                      : "Le donateur (ou le testateur) a explicitement choisi que ce bien tombe dans la communauté, malgré l'origine gratuite."}
                  </FieldHelp>}
                >
                  {inverseSensClause ? "Exclusion de communauté" : "Entrée en communauté"}
                </OptionToggle>
              )} />
            )}
            {showClauseRemploi && (
              <FormField control={form.control} name="clause_remploi" render={({ field }) => (
                <OptionToggle
                  checked={!!field.value}
                  onChange={field.onChange}
                  help={<FieldHelp>
                    {estCreance
                      ? "La somme prêtée provenait de fonds propres, ou la créance est née de la vente d'un bien propre : elle reste propre malgré sa naissance pendant l'union."
                      : "Ce bien a été acheté avec des fonds propres réemployés, ou reçu en échange d'un bien propre : il reste propre malgré l'acquisition pendant l'union."}
                  </FieldHelp>}
                >
                  Remploi
                </OptionToggle>
              )} />
            )}
            {showEstPropreParNature && (
              <FormField control={form.control} name="est_propre_par_nature" render={({ field }) => (
                <OptionToggle
                  checked={!!field.value}
                  onChange={field.onChange}
                  help={<FieldHelp>
                    Bien propre par nature (art. 1404) : vêtements, actions en réparation d'un dommage corporel ou moral, créances et pensions incessibles, instruments de travail nécessaires à la profession, droit d'exploitation d'une œuvre de l'esprit créée par l'époux (art. L121-9 CPI). Reste propre même en communauté (y compris universelle).
                  </FieldHelp>}
                >
                  Propre par nature
                </OptionToggle>
              )} />
            )}
          </div>
        </div>
      )}

      {showPrixSection && fraisDetailles && <FraisDetaillesFields form={form} />}

      {showPrixSection && !sansOrigine && showFinancementMixte && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField control={form.control} name="financement_mixte_apport_propre" render={({ field }) => (
          <FormItem>
            <FormLabel>Apport en fonds propres</FormLabel>
            <FieldHelp>
              Financement mixte : montant financé par des fonds propres, à comparer au prix d'acquisition total renseigné ci-dessus. Si cette contribution couvre au moins la moitié du prix : bien propre (art. 1436), récompense due à la communauté pour le solde. Sinon : bien commun, récompense due à l'époux apporteur. Sans effet si la clause de remploi est activée.
            </FieldHelp>
            <FormControl>
              <EuroInput className="bg-background border-border shadow-none" type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        </div>
      )}

    </>
  );

  return origineContent;
};

interface QualificationFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  qualificationRaison?: string;
  /** Sans libellé de champ, sous un titre de section qui le dit déjà (onglet Propriété). */
  sansLibelle?: boolean;
  /** Prénoms du couple : rappel de la répartition 50/50 d'un bien du couple hors indivision. */
  familyData?: FamilyInfo;
}

// Bloc "Qualification du bien" de l'onglet Propriété : qualification calculée
// (avec sa justification), correction manuelle et réactivation du calcul.
// Masqué pour les natures sans notion d'acquisition.
export const QualificationFields: React.FC<QualificationFieldsProps> = ({ form, qualificationRaison, sansLibelle = false, familyData }) => {
  const [showQualificationOverride, setShowQualificationOverride] = useState(false);

  const watchedNature = form.watch('nature');
  const watchedQualificationAuto = form.watch('qualification_auto');
  const watchedQualificationBien = form.watch('qualification_bien');
  const watchedDetenteurCouple = form.watch('detenteur') === 'Le couple';
  // Bien du couple hors indivision : 50/50 fixé par la loi, rappelé ici plutôt que dans un encadré à part.
  const repartition = familyData?.hasPartner && watchedDetenteurCouple && watchedQualificationBien !== 'Indivision'
    ? `50 / 50 entre ${familyData.userFirstName || 'vous'} et ${familyData.partnerFirstName || 'votre conjoint(e)'}`
    : null;

  // Prévoyance sans valeur de rachat : qualification sans objet (rien à partager entre époux).
  if ((NATURES_WITHOUT_ACQUISITION.includes(watchedNature) && !isCreance(watchedNature)) || isPrevoyanceSansRachat(watchedNature)) return null;

  return (
    <FormField control={form.control} name="qualification_bien" render={({ field }) => (
      <FormItem>
        {!sansLibelle && (<>
        <FormLabel>Qualification du bien</FormLabel>
        <FieldHelp>
          {watchedQualificationAuto !== false
            ? "Calculée automatiquement à partir du régime matrimonial, de l'origine du bien, de la date d'acquisition et du détenteur."
            : "Qualification définie manuellement : le calcul automatique n'écrasera plus cette valeur."}
        </FieldHelp>
        </>)}
        {watchedQualificationAuto !== false && !showQualificationOverride ? (
          <div className="border-l-2 border-lagon bg-lagon-soft/60 px-4 py-3">
            <div className="space-y-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-foreground">
                {watchedQualificationBien || 'Non calculable'}
                {repartition && <span className="text-[12.5px] font-normal text-muted-foreground">· {repartition}</span>}
                <span className="text-[11.5px] font-normal text-lagon-ink">calculée</span>
              </p>
              {qualificationRaison && (
                <p className="text-[12.5px] leading-snug text-muted-foreground">{qualificationRaison}</p>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className={`h-auto p-0 ${panelLinkClass}`}
                onClick={() => setShowQualificationOverride(true)}
              >
                Modifier manuellement
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue('qualification_auto', false);
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                  <SelectValue placeholder="Choisir une qualification" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {QUALIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {repartition && <p className="text-[12.5px] text-muted-foreground">{repartition}</p>}
            {watchedQualificationAuto === false && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className={`h-auto p-0 ${panelLinkClass}`}
                onClick={() => {
                  form.setValue('qualification_auto', true);
                  setShowQualificationOverride(false);
                }}
              >
                Réactiver le calcul automatique
              </Button>
            )}
          </>
        )}
        <FormMessage />
      </FormItem>
    )} />
  );
};

interface OrigineQualificationFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
  qualificationRaison?: string;
}

// Recompose "Origine" puis "Qualification du bien" dans l'ordre de l'onglet
// Propriété (AssetForm.tsx).
export const OrigineQualificationFields: React.FC<OrigineQualificationFieldsProps> = ({
  form,
  maritalContext,
  qualificationRaison
}) => (
  <>
    <OrigineFields form={form} maritalContext={maritalContext} />
    <QualificationFields form={form} qualificationRaison={qualificationRaison} />
  </>
);
