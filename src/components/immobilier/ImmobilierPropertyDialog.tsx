import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Asset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const residenceSchema = z.object({
  typologie_bien: z.enum(['Appartement', 'Maison']).optional(),
  surface_m2: z.number().min(0).optional().or(z.literal('')),
  date_acquisition: z.date().optional(),
  valeur_estimee: z.number().min(0).optional().or(z.literal('')),
  statut_bien: z.enum(['Usage personnel', 'En rénovation', 'En vente']).optional(),
  montant_immeuble: z.number().min(0).optional().or(z.literal('')),
  frais_agence: z.number().min(0).optional().or(z.literal('')),
  frais_notaire: z.number().min(0).optional().or(z.literal('')),
  frais_bancaires: z.number().min(0).optional().or(z.literal('')),
  frais_hypotheque: z.number().min(0).optional().or(z.literal('')),
  travaux_renovation: z.number().min(0).optional().or(z.literal('')),
  travaux_construction: z.number().min(0).optional().or(z.literal('')),
  meubles: z.number().min(0).optional().or(z.literal('')),
  financement_actif: z.boolean().optional(),
  financement_duree_mois: z.number().min(0).optional().or(z.literal('')),
  financement_apport: z.number().min(0).optional().or(z.literal('')),
  financement_taux_credit: z.number().min(0).optional().or(z.literal('')),
  financement_taux_assurance: z.number().min(0).optional().or(z.literal('')),
  type_location: z.enum(['Location nue', 'Location meublée non professionnelle (LMNP)', 'Location meublée professionnelle (LMP)']).optional(),
  regime_location: z.enum(['Micro-foncier', 'Réel', 'Micro-BIC', 'BIC']).optional(),
});

type ResidenceFormValues = z.infer<typeof residenceSchema>;

interface ImmobilierPropertyDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ImmobilierPropertyDialog: React.FC<ImmobilierPropertyDialogProps> = ({
  asset,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const { toast } = useToast();
  const isResidence = asset?.nature === 'Résidence principale' || asset?.nature === 'Résidences secondaires';
  const isRentalProperty = asset?.nature && [
    'Immeubles locatifs (loués nus)',
    'Immeubles locatifs (LMNP)',
    'Immeubles locatifs (LMP)',
    'Immeubles professionnels (hors LMP)',
    'Autres immeubles de rapport',
    'Parking / Garage / Box'
  ].includes(asset.nature);

  const form = useForm<ResidenceFormValues>({
    resolver: zodResolver(residenceSchema),
    defaultValues: {
      typologie_bien: asset?.typologie_bien as 'Appartement' | 'Maison' | undefined,
      surface_m2: asset?.surface_m2 ? Number(asset.surface_m2) : '',
      date_acquisition: asset?.date_acquisition ? new Date(asset.date_acquisition) : undefined,
      valeur_estimee: asset?.valeur_estimee ? Number(asset.valeur_estimee) : '',
      statut_bien: asset?.statut_bien as 'Usage personnel' | 'En rénovation' | 'En vente' | undefined,
      montant_immeuble: asset?.montant_immeuble ? Number(asset.montant_immeuble) : '',
      frais_agence: asset?.frais_agence ? Number(asset.frais_agence) : '',
      frais_notaire: asset?.frais_notaire ? Number(asset.frais_notaire) : '',
      frais_bancaires: asset?.frais_bancaires ? Number(asset.frais_bancaires) : '',
      frais_hypotheque: asset?.frais_hypotheque ? Number(asset.frais_hypotheque) : '',
      travaux_renovation: asset?.travaux_renovation ? Number(asset.travaux_renovation) : '',
      travaux_construction: asset?.travaux_construction ? Number(asset.travaux_construction) : '',
      meubles: asset?.meubles ? Number(asset.meubles) : '',
      financement_actif: asset?.financement_actif || false,
      financement_duree_mois: asset?.financement_duree_mois ? Number(asset.financement_duree_mois) : '',
      financement_apport: asset?.financement_apport ? Number(asset.financement_apport) : '',
      financement_taux_credit: asset?.financement_taux_credit ? Number(asset.financement_taux_credit) : '',
      financement_taux_assurance: asset?.financement_taux_assurance ? Number(asset.financement_taux_assurance) : '',
      type_location: asset?.type_location as any,
      regime_location: asset?.regime_location as any,
    },
  });

  React.useEffect(() => {
    if (asset) {
      form.reset({
        typologie_bien: asset.typologie_bien as 'Appartement' | 'Maison' | undefined,
        surface_m2: asset.surface_m2 ? Number(asset.surface_m2) : '',
        date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined,
        valeur_estimee: asset.valeur_estimee ? Number(asset.valeur_estimee) : '',
        statut_bien: asset.statut_bien as 'Usage personnel' | 'En rénovation' | 'En vente' | undefined,
        montant_immeuble: asset.montant_immeuble ? Number(asset.montant_immeuble) : '',
        frais_agence: asset.frais_agence ? Number(asset.frais_agence) : '',
        frais_notaire: asset.frais_notaire ? Number(asset.frais_notaire) : '',
        frais_bancaires: asset.frais_bancaires ? Number(asset.frais_bancaires) : '',
        frais_hypotheque: asset.frais_hypotheque ? Number(asset.frais_hypotheque) : '',
        travaux_renovation: asset.travaux_renovation ? Number(asset.travaux_renovation) : '',
        travaux_construction: asset.travaux_construction ? Number(asset.travaux_construction) : '',
        meubles: asset.meubles ? Number(asset.meubles) : '',
        financement_actif: asset.financement_actif || false,
        financement_duree_mois: asset.financement_duree_mois ? Number(asset.financement_duree_mois) : '',
        financement_apport: asset.financement_apport ? Number(asset.financement_apport) : '',
        financement_taux_credit: asset.financement_taux_credit ? Number(asset.financement_taux_credit) : '',
        financement_taux_assurance: asset.financement_taux_assurance ? Number(asset.financement_taux_assurance) : '',
        type_location: asset.type_location as any,
        regime_location: asset.regime_location as any,
      });
    }
  }, [asset, form]);

  // Auto-calculate frais_notaire when montant_immeuble changes
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'montant_immeuble' && value.montant_immeuble) {
        const montant = Number(value.montant_immeuble);
        if (!isNaN(montant) && montant > 0) {
          const fraisNotaire = montant * 0.075;
          form.setValue('frais_notaire', fraisNotaire);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: ResidenceFormValues) => {
    if (!asset) return;

    try {
      const updateData: Record<string, any> = {
        typologie_bien: data.typologie_bien || null,
        surface_m2: data.surface_m2 || null,
        date_acquisition: data.date_acquisition?.toISOString() || null,
        valeur_estimee: data.valeur_estimee || null,
        statut_bien: data.statut_bien || null,
        montant_immeuble: data.montant_immeuble || null,
        frais_agence: data.frais_agence || null,
        frais_notaire: data.frais_notaire || null,
        frais_bancaires: data.frais_bancaires || null,
        frais_hypotheque: data.frais_hypotheque || null,
        travaux_renovation: data.travaux_renovation || null,
        travaux_construction: data.travaux_construction || null,
        meubles: data.meubles || null,
        financement_actif: data.financement_actif || false,
        financement_duree_mois: data.financement_duree_mois || null,
        financement_apport: data.financement_apport || null,
        financement_taux_credit: data.financement_taux_credit || null,
        financement_taux_assurance: data.financement_taux_assurance || null,
        type_location: data.type_location || null,
        regime_location: data.regime_location || null,
      };

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', asset.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Les informations du bien ont été mises à jour',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les informations',
        variant: 'destructive',
      });
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les informations - {asset.denomination || 'Sans dénomination'}</DialogTitle>
          <DialogDescription>Catégorie: {asset.nature}</DialogDescription>
        </DialogHeader>

        {isResidence || isRentalProperty ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Données générales du bien</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="typologie_bien"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typologie du bien</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une typologie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Appartement">Appartement</SelectItem>
                            <SelectItem value="Maison">Maison</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="surface_m2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface (en m²)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Surface"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_acquisition"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date d'achat</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP', { locale: fr }) : <span>Sélectionner une date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valeur_estimee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur estimée actuelle (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Valeur estimée"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isResidence && (
                    <FormField
                      control={form.control}
                      name="statut_bien"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un statut" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Usage personnel">Usage personnel</SelectItem>
                              <SelectItem value="En rénovation">En rénovation</SelectItem>
                              <SelectItem value="En vente">En vente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coût de revient</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="montant_immeuble"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant de l'immeuble (hors frais d'agence et frais de notaire) (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Montant de l'immeuble"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frais_agence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frais d'agence (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Frais d'agence"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frais_notaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frais de notaire (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Frais de notaire (calculé automatiquement à 7,5%)"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frais_bancaires"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frais bancaires ou de courtier (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Frais bancaires"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frais_hypotheque"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frais d'hypothèque ou de caution (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Frais d'hypothèque"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="travaux_renovation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travaux de rénovation (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Travaux de rénovation"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="travaux_construction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travaux de construction (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Travaux de construction"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isRentalProperty && (
                    <FormField
                      control={form.control}
                      name="meubles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meubles (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Meubles"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {isRentalProperty && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Financement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="financement_actif"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Financement actif</FormLabel>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('financement_actif') && (
                        <>
                          <FormField
                            control={form.control}
                            name="financement_duree_mois"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée (mois)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Durée en mois"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="financement_apport"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Apport (€)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Apport"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="financement_taux_credit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taux du crédit (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Taux du crédit"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="financement_taux_assurance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taux assurance du crédit (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Taux assurance"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Type de location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type_location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de location</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger size="lg">
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Location nue">Location nue</SelectItem>
                                <SelectItem value="Location meublée non professionnelle (LMNP)">
                                  Location meublée non professionnelle (LMNP)
                                </SelectItem>
                                <SelectItem value="Location meublée professionnelle (LMP)">
                                  Location meublée professionnelle (LMP)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                       {form.watch('type_location') && (
                        <FormField
                          control={form.control}
                          name="regime_location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Régime fiscal</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger size="lg">
                                    <SelectValue placeholder="Sélectionner un régime" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {asset?.nature === 'Immeubles locatifs (loués nus)' ? (
                                    <>
                                      <SelectItem value="Micro-foncier">Micro-foncier</SelectItem>
                                      <SelectItem value="Réel">Réel</SelectItem>
                                    </>
                                  ) : (asset?.nature === 'Immeubles locatifs (LMNP)' || asset?.nature === 'Immeubles professionnels (hors LMP)') ? (
                                    <>
                                      <SelectItem value="Micro-BIC">Micro-BIC</SelectItem>
                                      <SelectItem value="BIC">BIC</SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="Micro-BIC">Micro-BIC</SelectItem>
                                      <SelectItem value="BIC">BIC</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              La gestion des informations pour cette catégorie sera disponible prochainement.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
