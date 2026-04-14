import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { ASSET_NATURES, getAssetCategory, NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { useAssetForm, NATURES_WITH_ETABLISSEMENT } from '@/hooks/useAssetForm';
import { 
  ORIGINE_ACTIF_OPTIONS, 
  SITUATION_PARTICULIERE_OPTIONS, 
  MODE_DETENTION_OPTIONS 
} from '@/schemas/assetSchema';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: any, charges: AssetCharge[]) => Promise<void>;
  onCancel: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}

export const AssetForm: React.FC<AssetFormProps> = ({
  asset,
  onSubmit,
  onCancel,
  onDelete
}) => {
  const {
    form,
    charges,
    showChargeForm,
    setShowChargeForm,
    editingCharge,
    setEditingCharge,
    isLoading,
    detenteurOptions,
    familyMembers,
    familyData,
    handleSubmit,
    handleChargeSubmit,
    handleChargeDelete,
    handleChargeEdit
  } = useAssetForm({ asset, onSubmit });

  const handleDelete = async () => {
    if (asset?.id && onDelete && window.confirm('Êtes-vous sûr de vouloir supprimer cet actif ? Cette action est irréversible.')) {
      await onDelete(asset.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{asset ? 'Modifier l\'actif' : 'Ajouter un actif'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Section 1: Description de l'actif */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Description de l'actif</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nature" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nature *</FormLabel>
                      <FormControl>
                        <SearchableSelect options={ASSET_NATURES} value={field.value} onChange={field.onChange} placeholder="Choisir une nature" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="mode_detention" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de détention</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg">
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

                  {/* Beneficiaire autre partie - conditional */}
                  {(form.watch('mode_detention') === 'Usufruit' || form.watch('mode_detention') === 'Nue-propriété') && (
                    <FormField control={form.control} name="beneficiaire_autre_partie" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch('mode_detention') === 'Usufruit' ? 'Nu-propriétaire' : 'Usufruitier'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg">
                              <SelectValue placeholder="Choisir une personne" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background z-50">
                            {familyMembers.map((member) => (
                              <SelectItem key={member.id || member.nom} value={member.id || ''}>
                                {member.prenom ? `${member.prenom} ${member.nom}` : member.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Sélectionnez le bénéficiaire parmi les personnes renseignées dans la section Famille
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="valeur_estimee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur estimée (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="date_estimation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'estimation</FormLabel>
                      <FormControl>
                        <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="denomination" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dénomination</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Établissement - conditional */}
                  {NATURES_WITH_ETABLISSEMENT.includes(form.watch('nature')) && (
                    <FormField control={form.control} name="etablissement" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Établissement</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Origine de l'actif */}
                <FormField control={form.control} name="origine_actif" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origine de l'actif</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([value])}
                      value={field.value?.[0] || 'Acquisition à titre onéreuse'}
                    >
                      <FormControl>
                        <SelectTrigger size="lg">
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

                {/* Situation particulière */}
                <FormField control={form.control} name="situation_particuliere" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situation particulière</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([value])}
                      value={field.value?.[0] || 'Non'}
                    >
                      <FormControl>
                        <SelectTrigger size="lg">
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
              </div>

              <Separator />

              {/* Section 2: Détenteur */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Détenteur</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="detenteur" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Détenteur</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg">
                            <SelectValue placeholder="Choisir un détenteur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {detenteurOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Percentages if "Le couple" is selected */}
                  {form.watch('detenteur') === 'Le couple' && familyData.hasPartner && (
                    <>
                      <FormField control={form.control} name="pourcentage_utilisateur" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pourcentage appartenant à {familyData.userFirstName || 'vous'} (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              {...field}
                              onChange={e => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                form.setValue('pourcentage_conjoint', 100 - value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="pourcentage_conjoint" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pourcentage appartenant à {familyData.partnerFirstName || 'votre conjoint(e)'} (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              {...field}
                              onChange={e => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                form.setValue('pourcentage_utilisateur', 100 - value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </>
                  )}

                  <FormField control={form.control} name="date_acquisition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'acquisition</FormLabel>
                      <FormControl>
                        <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="valeur_acquisition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur d'acquisition (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="frais_acquisition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frais d'acquisition (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Section 3: Charges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">3. Charges</h3>
                  <Button type="button" variant="outline" onClick={() => setShowChargeForm(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter une charge
                  </Button>
                </div>

                {charges.length > 0 && (
                  <div className="space-y-2">
                    {charges.map(charge => (
                      <Card key={charge.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{charge.denomination}</p>
                            <p className="text-sm text-muted-foreground">
                              {charge.type_charge} - {charge.montant} {charge.unite} ({charge.periodicite})
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleChargeEdit(charge)}>
                              Modifier
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleChargeDelete(charge.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Section 4: Attachement émotionnel */}
              <div className="space-y-4">
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

                {/* Checkbox Transfert dans Immobilier - visible seulement pour actifs immobiliers */}
                {getAssetCategory(form.watch('nature')) === 'actifs immobiliers' && (
                  <FormField
                    control={form.control}
                    name="transfert_immobilier"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Transfert dans Immobilier</FormLabel>
                          <FormDescription>
                            Ce bien apparaîtra dans la section "Immobilier" → "Mes biens"
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-between">
                {asset?.id && onDelete && (
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                    Supprimer l'actif
                  </Button>
                )}
                <div className="flex space-x-2 ml-auto">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Formulaire de charge */}
      {showChargeForm && (
        <ChargeForm
          charge={editingCharge || undefined}
          onSubmit={handleChargeSubmit}
          onCancel={() => {
            setShowChargeForm(false);
            setEditingCharge(null);
          }}
        />
      )}
    </div>
  );
};
