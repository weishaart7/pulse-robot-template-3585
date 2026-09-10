import React from 'react';
import { Globe } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AssetFormValues, SITUATION_PARTICULIERE_OPTIONS } from '@/schemas/assetSchema';
import {
  getAssetCategory,
  NATURES_PER,
  CTO_SOUS_JACENT_OPTIONS,
  PARTS_FONCIERES_NATURES,
  REGIME_FISCAL_PARTS_OPTIONS,
  CORPS_NATURES_CHAMPS,
  RETRAITE_PREVOYANCE_NATURES_CHAMPS,
  MODE_SORTIE_OPTIONS,
  NATURES_EPARGNE_SALARIALE,
  MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS,
  LIQUIDITES_NATURES_CHAMPS,
  VALEURS_MOBILIERES_NATURES_CHAMPS,
  isEpargneAssuranceVie,
} from '@/constants/assetTypes';
import { NATURES_LIQUIDITES_FR } from '@/schemas/assetSchema';
import { NATURES_WITH_ETABLISSEMENT } from '@/hooks/useAssetForm';
import { isSocieteEligibleNature } from '@/lib/patrimoine/societeTransfer';

interface CaracteristiquesFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

// Reprend à l'identique l'onglet "Caractéristiques" de AssetForm.tsx : tous
// les champs conditionnés à la nature de l'actif (établissement, PER,
// montres, vins, produits structurés, SCPI, etc.). Réutilisable telle quelle
// à la fois par l'onglet de modification et par l'étape "Particularités" du
// wizard de création.
export const CaracteristiquesFields: React.FC<CaracteristiquesFieldsProps> = ({ form }) => {
  const watchedNature = form.watch('nature');
  const isImmobilier = getAssetCategory(watchedNature) === 'actifs immobiliers';
  const isSocieteEligible = isSocieteEligibleNature(watchedNature);
  const isEpargneAV = isEpargneAssuranceVie(watchedNature);
  const showEtablissement = NATURES_WITH_ETABLISSEMENT.includes(watchedNature);
  const showBienEtranger = watchedNature && !NATURES_LIQUIDITES_FR.includes(watchedNature);
  const isPER = NATURES_PER.includes(watchedNature);
  const isCTO = watchedNature === 'Compte-titres (CTO)';
  const isPartsFoncieres = (PARTS_FONCIERES_NATURES as readonly string[]).includes(watchedNature);
  const etablissementLabel = watchedNature === 'Parts de SCPI'
    ? 'Société de gestion'
    : isPartsFoncieres
      ? 'Gestionnaire'
      : 'Établissement';
  const regimeFiscalPartsOptions = REGIME_FISCAL_PARTS_OPTIONS[watchedNature] || [];
  const corpsChamps = CORPS_NATURES_CHAMPS[watchedNature] || [];
  const showCertificatExpertise = corpsChamps.includes('certificat_expertise');
  const showNumeroSerie = corpsChamps.includes('numero_serie');
  const showQuantiteMillesime = corpsChamps.includes('quantite_millesime');
  const watchedCertificatExpertise = form.watch('certificat_expertise');
  const retraitePrevoyanceChamps = RETRAITE_PREVOYANCE_NATURES_CHAMPS[watchedNature] || [];
  const showCapitalGaranti = retraitePrevoyanceChamps.includes('capital_garanti');
  const showModeSortie = retraitePrevoyanceChamps.includes('mode_sortie');
  const watchedSousTypePer = form.watch('sous_type_per');
  // Pour les 3 natures PER, le bénéficiaire désigné n'a de sens que pour la variante
  // assurantielle (support de placement en unités de compte avec clause bénéficiaire) —
  // masqué si Bancaire ou non renseigné. Pour les 3 natures de prévoyance/décès, aucune
  // condition supplémentaire : isPER est faux, la condition passe telle quelle.
  const showBeneficiaireDesigne = retraitePrevoyanceChamps.includes('beneficiaire_designe')
    && (!isPER || watchedSousTypePer === 'Assurantiel');
  const isEpargneSalariale = (NATURES_EPARGNE_SALARIALE as readonly string[]).includes(watchedNature);
  const liquiditesChamps = LIQUIDITES_NATURES_CHAMPS[watchedNature] || [];
  const showTauxRemuneration = liquiditesChamps.includes('taux_remuneration');
  const showDateEcheanceLiquidites = liquiditesChamps.includes('date_echeance');
  const valeursMobilieresChamps = VALEURS_MOBILIERES_NATURES_CHAMPS[watchedNature] || [];
  const showPlafondVerse = valeursMobilieresChamps.includes('plafond_verse');
  const showDureeBlocage = valeursMobilieresChamps.includes('duree_blocage');
  const showReductionIrEntree = valeursMobilieresChamps.includes('reduction_ir_entree');
  const showDateAttribution = valeursMobilieresChamps.includes('date_attribution');
  const showPrixExercice = valeursMobilieresChamps.includes('prix_exercice');
  const showMontantEngageAppele = valeursMobilieresChamps.includes('montant_engage');
  const showSousJacent = valeursMobilieresChamps.includes('sous_jacent');
  const showDateEcheanceVM = valeursMobilieresChamps.includes('date_echeance');
  const showCapitalGarantiVM = valeursMobilieresChamps.includes('capital_garanti');
  const showLieuStockageQuantite = valeursMobilieresChamps.includes('lieu_stockage');
  const watchedCtoMultiActifs = form.watch('cto_multi_actifs');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showEtablissement && (
          <FormField control={form.control} name="etablissement" render={({ field }) => (
            <FormItem>
              <FormLabel>{etablissementLabel}</FormLabel>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {isPartsFoncieres && (
          <FormField control={form.control} name="revenus_distribues_12m" render={({ field }) => (
            <FormItem>
              <FormLabel>Revenus distribués (12 derniers mois)</FormLabel>
              <FormControl>
                <Input
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {isPartsFoncieres && (
          <FormField control={form.control} name="regime_fiscal_parts" render={({ field }) => (
            <FormItem>
              <FormLabel>Régime fiscal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                    <SelectValue placeholder="Choisir le régime fiscal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {regimeFiscalPartsOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="situation_particuliere" render={({ field }) => (
          <FormItem>
            <FormLabel>Situation particulière</FormLabel>
            <Select
              onValueChange={(value) => field.onChange([value])}
              value={field.value?.[0] || 'Non'}
            >
              <FormControl>
                <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                  <SelectValue placeholder="Choisir la situation particulière" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SITUATION_PARTICULIERE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {showNumeroSerie && (
          <FormField control={form.control} name="numero_serie" render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de série</FormLabel>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {showQuantiteMillesime && (
          <FormField control={form.control} name="quantite_millesime" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantité / Millésime</FormLabel>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      {showCertificatExpertise && (
        <FormField
          control={form.control}
          name="certificat_expertise"
          render={({ field }) => (
            <FormItem className="rounded-md border p-4 space-y-3">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Certificat d'authenticité ou expertise</FormLabel>
                </div>
              </div>

              {watchedCertificatExpertise && (
                <FormField control={form.control} name="certificat_expertise_reference" render={({ field: refField }) => (
                  <FormItem className="pl-7">
                    <FormLabel>Référence</FormLabel>
                    <FormControl>
                      <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...refField} value={refField.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </FormItem>
          )}
        />
      )}

      {showBienEtranger && (
        <FormField
          control={form.control}
          name="bien_etranger"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Bien situé à l'étranger
                </FormLabel>
                <FormDescription>
                  Impact fiscal : déclaration spécifique (formulaire 3916 pour les comptes, conventions fiscales, IFI sur immobilier étranger). À traiter au cas par cas.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {/*
        Le transfert vers "Immobilier" est automatique pour toute nature de la famille "actifs
        immobiliers" (cf. handleSubmit dans useAssetForm.ts) et ne se pilote donc plus par case à
        cocher — sauf pour "Parts de SCI", seule nature à appartenir aussi à SOCIETE_ELIGIBLE_NATURES :
        elle doit rester exclusive avec "Transfert dans Sociétés", d'où le choix manuel conservé ici.
      */}
      {isImmobilier && isSocieteEligible && (
        <FormField
          control={form.control}
          name="transfert_immobilier"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) form.setValue('transfert_societe', false);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Transfert dans Immobilier</FormLabel>
                <FormDescription>
                  Ce bien apparaîtra dans la section "Immobilier" → "Mes biens"
                  {' '}(exclusif avec "Transfert dans Sociétés")
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {isSocieteEligible && (
        <FormField
          control={form.control}
          name="transfert_societe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) form.setValue('transfert_immobilier', false);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Transfert dans Sociétés</FormLabel>
                <FormDescription>
                  Une fiche société sera créée automatiquement dans la section "Sociétés" → "Mes sociétés"
                  {isImmobilier && ' (exclusif avec "Transfert dans Immobilier")'}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {isPER && (
        <FormField control={form.control} name="sous_type_per" render={({ field }) => (
          <FormItem>
            <FormLabel>Sous-type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                  <SelectValue placeholder="Choisir un sous-type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Bancaire">Bancaire</SelectItem>
                <SelectItem value="Assurantiel">Assurantiel</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {(showCapitalGaranti || showCapitalGarantiVM || showBeneficiaireDesigne || showModeSortie) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(showCapitalGaranti || showCapitalGarantiVM) && (
            <FormField control={form.control} name="capital_garanti" render={({ field }) => (
              <FormItem>
                <FormLabel>Capital garanti (€)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showBeneficiaireDesigne && (
            <FormField control={form.control} name="beneficiaire_designe" render={({ field }) => (
              <FormItem>
                <FormLabel>Bénéficiaire désigné</FormLabel>
                <FormControl>
                  <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showModeSortie && (
            <FormField control={form.control} name="mode_sortie" render={({ field }) => (
              <FormItem>
                <FormLabel>Mode de sortie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                      <SelectValue placeholder="Choisir le mode de sortie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MODE_SORTIE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {isEpargneSalariale && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="abondement_employeur" render={({ field }) => (
            <FormItem>
              <FormLabel>Abondement employeur (€)</FormLabel>
              <FormControl>
                <Input
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="date_disponibilite" render={({ field }) => (
            <FormItem>
              <FormLabel>Date de disponibilité / déblocage</FormLabel>
              <FormControl>
                <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="motif_deblocage_anticipe" render={({ field }) => (
            <FormItem>
              <FormLabel>Motif de déblocage anticipé</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                    <SelectValue placeholder="Choisir le motif" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="support_investissement" render={({ field }) => (
            <FormItem>
              <FormLabel>Support d'investissement</FormLabel>
              <FormControl>
                <Input
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  placeholder="Ex. FCPE monétaire, FCPE actions diversifiées"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {isCTO && (
        <>
          <FormField
            control={form.control}
            name="cto_multi_actifs"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ce compte-titres détient d'autres actifs que des actions/obligations</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {watchedCtoMultiActifs && (
            <FormField control={form.control} name="cto_nature_sous_jacent" render={({ field }) => (
              <FormItem>
                <FormLabel>Nature réelle du sous-jacent principal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                      <SelectValue placeholder="Choisir la nature du sous-jacent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CTO_SOUS_JACENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </>
      )}

      {(showTauxRemuneration || showDateEcheanceLiquidites) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDateEcheanceLiquidites && (
            <FormField control={form.control} name="date_echeance" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'échéance</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showTauxRemuneration && (
            <FormField control={form.control} name="taux_remuneration" render={({ field }) => (
              <FormItem>
                <FormLabel>Taux de rémunération (%)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showPlafondVerse && (
        <FormField control={form.control} name="plafond_verse" render={({ field }) => (
          <FormItem>
            <FormLabel>Montant versé (€)</FormLabel>
            <FormControl>
              <Input
                className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                type="number"
                step="0.01"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {(showDureeBlocage || showReductionIrEntree) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDureeBlocage && (
            <FormField control={form.control} name="duree_blocage" render={({ field }) => (
              <FormItem>
                <FormLabel>Durée de blocage</FormLabel>
                <FormControl>
                  <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" placeholder="Ex. 5 ans, jusqu'au 31/12/2030" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showReductionIrEntree && (
            <FormField control={form.control} name="reduction_ir_entree" render={({ field }) => (
              <FormItem>
                <FormLabel>Réduction d'IR à l'entrée (%)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showMontantEngageAppele && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="montant_engage" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant engagé (€)</FormLabel>
              <FormControl>
                <Input
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="montant_appele" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant appelé (€)</FormLabel>
              <FormControl>
                <Input
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {(showDateAttribution || showPrixExercice) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDateAttribution && (
            <FormField control={form.control} name="date_attribution" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'attribution</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showPrixExercice && (
            <FormField control={form.control} name="prix_exercice" render={({ field }) => (
              <FormItem>
                <FormLabel>Prix d'exercice (€)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {(showSousJacent || showDateEcheanceVM) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showSousJacent && (
            <FormField control={form.control} name="sous_jacent" render={({ field }) => (
              <FormItem>
                <FormLabel>Sous-jacent</FormLabel>
                <FormControl>
                  <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showDateEcheanceVM && (
            <FormField control={form.control} name="date_echeance" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'échéance</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showLieuStockageQuantite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="lieu_stockage" render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu de stockage</FormLabel>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="quantite" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantité</FormLabel>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" placeholder="Ex. 500g, 10 onces" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {!isEpargneAV && (
        <FormField
          control={form.control}
          name="attachement_emotionnel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attachement émotionnel</FormLabel>
              <FormDescription>
                De 0 (aucun attachement) à 10 (attachement très fort)
              </FormDescription>
              <FormControl>
                <div className="space-y-2">
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={[field.value || 0]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Aucun</span>
                    <span className="font-medium text-foreground">{field.value || 0} / 10</span>
                    <span>Très fort</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
