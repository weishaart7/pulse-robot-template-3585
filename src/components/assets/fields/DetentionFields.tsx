import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetFormValues, MODE_DETENTION_OPTIONS } from '@/schemas/assetSchema';
import { isEpargneAssuranceVie } from '@/constants/assetTypes';
import { isPacsIndivision } from '@/lib/patrimoine/qualification';
import { FamilyMember, MaritalContext } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { IndivisairesSection, IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementSection, DemembrementDraft } from '@/components/assets/DemembrementSection';

interface DetentionFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  detenteurOptions: string[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  maritalContext: MaritalContext;
  indivisaires: IndivisaireDraft[];
  setIndivisaires: (value: IndivisaireDraft[]) => void;
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
  detenteurAResoudre: boolean;
}

// Reprend à l'identique le bloc "détention" de l'onglet Propriété
// (AssetForm.tsx) : mode de détention, indivision, détenteur, quote-part,
// co-indivisaires, contreparties de démembrement, licitation PACS.
export const DetentionFields: React.FC<DetentionFieldsProps> = ({
  form,
  detenteurOptions,
  familyData,
  familyMembers,
  maritalContext,
  indivisaires,
  setIndivisaires,
  demembrements,
  setDemembrements,
  detenteurAResoudre
}) => {
  const watchedNature = form.watch('nature');
  const watchedDetenteur = form.watch('detenteur');
  const watchedModeDetention = form.watch('mode_detention');
  const watchedQualificationBien = form.watch('qualification_bien');

  const isEpargneAV = isEpargneAssuranceVie(watchedNature);
  const isDemembre = watchedModeDetention === 'Usufruit' || watchedModeDetention === 'Nue-propriété';
  const demembrementCounterpartRole = watchedModeDetention === 'Usufruit' ? 'Nu-propriétaire' : 'Usufruitier';
  const showLicitationPacs = isPacsIndivision(maritalContext.statutCouple, maritalContext.conventionPacs, maritalContext.datePacs)
    && watchedDetenteur === 'Le couple';
  // "Le couple" (bien commun, 50/50 fixé par la loi) n'a de sens que si la
  // qualification n'est pas "Bien propre"/"Bien personnel" (100/0 binaire,
  // aucun pourcentage possible) — cf. useAssetForm.ts pour la resélection
  // forcée si la qualification change après coup.
  const filteredDetenteurOptions = (watchedQualificationBien === 'Bien propre' || watchedQualificationBien === 'Bien personnel'
    ? detenteurOptions.filter(option => option !== 'Le couple')
    : detenteurOptions
  ).filter(option => option !== 'Indivision');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="mode_detention" render={({ field }) => (
          <FormItem>
            <FormLabel>Mode de détention</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                  <SelectValue placeholder="Choisir un mode de détention" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {MODE_DETENTION_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-full">
          <FormControl>
            <Checkbox
              checked={watchedDetenteur === 'Indivision'}
              onCheckedChange={(checked) => {
                if (checked) {
                  form.setValue('detenteur', 'Indivision');
                } else if (watchedDetenteur === 'Indivision') {
                  form.setValue('detenteur', '');
                }
              }}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Ce bien est détenu en indivision avec un tiers (hors couple)</FormLabel>
            <FormDescription>
              Dans ce cas, la qualification du bien est directement "Indivision", quel que soit le régime matrimonial ou l'origine du bien.
            </FormDescription>
          </div>
        </FormItem>

        {watchedDetenteur !== 'Indivision' && (
          <FormField control={form.control} name="detenteur" render={({ field }) => (
            <FormItem>
              {/* "Souscripteur" pour les 4 natures épargne/assurance-vie : vocabulaire
                  assurantiel, même colonne `detenteur` (cf. constants/assetTypes.ts). */}
              <FormLabel>{isEpargneAV ? 'Souscripteur' : 'Détenteur'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                    <SelectValue placeholder={isEpargneAV ? 'Choisir un souscripteur' : 'Choisir un détenteur'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredDetenteurOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(watchedQualificationBien === 'Bien propre' || watchedQualificationBien === 'Bien personnel') && (
                <FormDescription>
                  "Le couple" n'est pas proposé : ce bien est qualifié {watchedQualificationBien.toLowerCase()}, il appartient donc entièrement à une seule personne.
                </FormDescription>
              )}
              {detenteurAResoudre && (
                <Alert>
                  <AlertTitle>À qui appartient ce bien ?</AlertTitle>
                  <AlertDescription>
                    <p>
                      Ce bien vient d'être qualifié "{watchedQualificationBien?.toLowerCase()}" : il appartient à une seule personne. Confirmez ou corrigez {isEpargneAV ? 'le souscripteur' : 'le détenteur'}.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[familyData.userFirstName, ...(familyData.hasPartner ? [familyData.partnerFirstName] : [])]
                        .filter((prenom): prenom is string => !!prenom)
                        .map((prenom) => (
                          <Button
                            key={prenom}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue('detenteur', prenom)}
                          >
                            {prenom}
                          </Button>
                        ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <FormMessage />
            </FormItem>
          )} />
        )}

        {/* Quote-part : librement saisissable en indivision (elle dépend de ce
            que chacun a réellement financé), mais figée à 50/50 pour un bien
            commun, où la moitié revient de droit à chaque époux — cf.
            getPartSuccessorale, qui retourne 0,5 en dur dans ce cas. */}
        {watchedDetenteur === 'Le couple' && familyData.hasPartner && (
          watchedQualificationBien === 'Indivision' ? (
            <FormField control={form.control} name="pourcentage_utilisateur" render={({ field }) => {
              const partUtilisateur = field.value ?? 50;
              const partConjoint = 100 - Math.min(100, Math.max(0, partUtilisateur));
              return (
                <FormItem className="col-span-full">
                  <FormLabel>Quote-part de {familyData.userFirstName || 'vous'} dans l'indivision (%)</FormLabel>
                  <FormDescription>
                    La quote-part de {familyData.partnerFirstName || 'votre conjoint(e)'} est le complément à 100 % : {partConjoint} %.
                  </FormDescription>
                  <FormControl>
                    <Input
                      className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={field.value ?? ''}
                      onChange={e => {
                        const saisi = parseFloat(e.target.value);
                        const valeur = isNaN(saisi) ? undefined : Math.min(100, Math.max(0, saisi));
                        field.onChange(valeur);
                        form.setValue('pourcentage_conjoint', valeur === undefined ? undefined : 100 - valeur);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }} />
          ) : (
            <div className="col-span-full text-sm text-muted-foreground bg-muted rounded-[5px] px-3 py-2">
              Réparti 50% / 50% entre {familyData.userFirstName || 'vous'} et {familyData.partnerFirstName || 'votre conjoint(e)'} — bien commun, fixé par la loi (non modifiable).
            </div>
          )
        )}
      </div>

      {/* Indivisaires (si Indivision sélectionnée) */}
      {watchedDetenteur === 'Indivision' && (
        <IndivisairesSection
          familyMembers={familyMembers}
          value={indivisaires}
          onChange={setIndivisaires}
        />
      )}

      {/* Démembrement (si mode de détention Usufruit ou Nue-propriété) */}
      {isDemembre && (
        <DemembrementSection
          role={demembrementCounterpartRole}
          familyMembers={familyMembers}
          value={demembrements}
          onChange={setDemembrements}
        />
      )}

      {showLicitationPacs && (
        <div className="space-y-4 rounded-md border p-4">
          <div className="space-y-1 leading-none">
            <FormLabel>Licitation de plus de moitié (art. 515-5-2)</FormLabel>
            <FormDescription>
              Si l'un des partenaires a racheté aux autres indivisaires une part du bien au-delà de sa propre part initiale, cette portion rachetée reste personnelle et n'entre pas dans l'indivision du PACS. Champ déclaratif : n'est pas répercuté automatiquement dans la qualification calculée ci-dessous.
            </FormDescription>
          </div>

          <FormField control={form.control} name="licitation_acquereur" render={({ field }) => (
            <FormItem>
              <FormLabel>Partenaire acquéreur</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px]">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="utilisateur">{familyData.userFirstName || 'Vous'}</SelectItem>
                  <SelectItem value="conjoint">{familyData.partnerFirstName || 'Conjoint'}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="part_licitation_personnelle" render={({ field }) => (
            <FormItem>
              <FormLabel>Part rachetée par licitation (%)</FormLabel>
              <FormDescription>Pourcentage de la valeur du bien acquis au-delà de la part initiale de l'acquéreur.</FormDescription>
              <FormControl>
                <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" min="0" max="100" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}
    </>
  );
};
