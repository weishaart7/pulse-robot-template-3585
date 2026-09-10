import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetFormValues, ORIGINE_ACTIF_OPTIONS } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION, NATURES_DATE_OUVERTURE } from '@/constants/assetTypes';
import { QUALIFICATION_OPTIONS, isRegimeCommunautaire, isInCouple } from '@/lib/patrimoine/qualification';
import { MaritalContext } from '@/hooks/useAssetForm';

interface OrigineQualificationFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
  qualificationRaison?: string;
}

// Reprend à l'identique les blocs "Origine" et "Qualification du bien" de
// l'onglet Propriété (AssetForm.tsx), pour être réutilisable tel quel dans
// le futur wizard de création (étape "D'où vient-il").
export const OrigineQualificationFields: React.FC<OrigineQualificationFieldsProps> = ({
  form,
  maritalContext,
  qualificationRaison
}) => {
  const [showQualificationOverride, setShowQualificationOverride] = useState(false);

  const watchedNature = form.watch('nature');
  const watchedDetenteur = form.watch('detenteur');
  const watchedOrigineActif = form.watch('origine_actif');
  const watchedClauseRemploi = form.watch('clause_remploi');
  const watchedQualificationAuto = form.watch('qualification_auto');
  const watchedQualificationBien = form.watch('qualification_bien');

  const hideAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature);
  const isDateOuverture = NATURES_DATE_OUVERTURE.includes(watchedNature);
  const isIndivisionHorsCouple = watchedDetenteur === 'Indivision';
  const showClauseEntreeCommunaute = (watchedOrigineActif || []).includes('Donation') || (watchedOrigineActif || []).includes('Héritage');
  const showClauseRemploi = (watchedOrigineActif || []).includes('Acquisition à titre onéreux');
  const showEstPropreParNature = isInCouple(maritalContext.statutCouple);
  // Financement mixte (art. 1436) : ne se pose qu'en régime communautaire,
  // pour une acquisition à titre onéreux, et n'a plus de sens si le remploi
  // total est déjà acté (clause_remploi couvre alors la totalité du prix).
  const showFinancementMixte = isRegimeCommunautaire(maritalContext.regimeMatrimonial)
    && showClauseRemploi
    && !watchedClauseRemploi;

  const origineContent = isIndivisionHorsCouple ? (
    <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
      Sans effet pour un bien en indivision hors couple : la qualification est directement "Indivision", quels que soient l'origine et les clauses éventuelles.
    </div>
  ) : hideAcquisition ? (
    <div className="text-center py-8 text-muted-foreground">
      Les informations d'acquisition ne sont pas applicables pour ce type d'actif.
    </div>
  ) : (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="date_acquisition" render={({ field }) => (
          <FormItem>
            <FormLabel>{isDateOuverture ? "Date d'ouverture" : "Date d'acquisition"}</FormLabel>
            <FormControl>
              <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="origine_actif" render={({ field }) => (
          <FormItem>
            <FormLabel>Origine de l'actif</FormLabel>
            <Select
              onValueChange={(value) => field.onChange([value])}
              value={field.value?.[0] || 'Acquisition à titre onéreux'}
            >
              <FormControl>
                <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                  <SelectValue placeholder="Choisir l'origine de l'actif" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ORIGINE_ACTIF_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="valeur_acquisition" render={({ field }) => (
          <FormItem>
            <FormLabel>Valeur d'achat / réception (€)</FormLabel>
            <FormDescription>Prix payé à l'achat, ou valeur déclarée si reçu en donation/héritage. Sert de base pour le calcul de la plus-value.</FormDescription>
            <FormControl>
              <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="frais_acquisition" render={({ field }) => (
          <FormItem>
            <FormLabel>Frais d'acquisition (€)</FormLabel>
            <FormDescription>Notaire, agence, droits d'enregistrement, etc.</FormDescription>
            <FormControl>
              <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {showClauseEntreeCommunaute && (
        <FormField
          control={form.control}
          name="clause_entree_communaute"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Clause d'entrée en communauté</FormLabel>
                <FormDescription>
                  Le donateur (ou le testateur) a explicitement choisi que ce bien tombe dans la communauté, malgré l'origine gratuite.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {showClauseRemploi && (
        <FormField
          control={form.control}
          name="clause_remploi"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Clause de remploi actée</FormLabel>
                <FormDescription>
                  Ce bien a été acheté avec des fonds propres réemployés : il reste propre malgré l'acquisition à titre onéreux pendant l'union.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {showFinancementMixte && (
        <FormField control={form.control} name="financement_mixte_apport_propre" render={({ field }) => (
          <FormItem>
            <FormLabel>Financement mixte : contribution en fonds propres (€)</FormLabel>
            <FormDescription>
              Montant financé par des fonds propres, à comparer au prix d'acquisition total renseigné ci-dessus. Si cette contribution couvre au moins la moitié du prix : bien propre (art. 1436), récompense due à la communauté pour le solde. Sinon : bien commun, récompense due à l'époux apporteur. Sans effet si la clause de remploi ci-dessus est cochée.
            </FormDescription>
            <FormControl>
              <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {showEstPropreParNature && (
        <FormField
          control={form.control}
          name="est_propre_par_nature"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Bien propre par nature (art. 1404)</FormLabel>
                <FormDescription>
                  Vêtements, actions en réparation d'un dommage corporel ou moral, créances et pensions incessibles, instruments de travail nécessaires à la profession : reste propre même en communauté (y compris universelle), sauf clause d'extension de la communauté aux biens propres par nature.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}
    </>
  );

  return (
    <>
      {origineContent}

      {!hideAcquisition && (
        <FormField control={form.control} name="qualification_bien" render={({ field }) => (
          <FormItem>
            <FormLabel>Qualification du bien</FormLabel>
            {watchedQualificationAuto !== false && !showQualificationOverride ? (
              <div className="flex items-start gap-3 rounded-md border p-4 bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-semibold text-foreground">{watchedQualificationBien || 'Non calculable'}</p>
                  {qualificationRaison && (
                    <p className="text-xs text-muted-foreground italic">{qualificationRaison}</p>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
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
                    <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                      <SelectValue placeholder="Choisir une qualification" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {QUALIFICATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {watchedQualificationAuto !== false
                    ? "Calculée automatiquement à partir du régime matrimonial, de l'origine du bien, de la date d'acquisition et du détenteur."
                    : "Qualification définie manuellement : le calcul automatique n'écrasera plus cette valeur."}
                </FormDescription>
                {watchedQualificationAuto === false && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
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
      )}
    </>
  );
};
