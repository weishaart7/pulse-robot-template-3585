import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { ASSET_NATURES } from '@/constants/assetTypes';
import { familyService } from '@/services/familyService';

const assetSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  denomination: z.string().optional(),
  mode_detention: z.string().optional(),
  valeur_estimee: z.number().optional(),
  date_estimation: z.date().optional(),
  revalorisation_annuelle: z.number().optional(),
  detenteur: z.string().optional(),
  pourcentage_utilisateur: z.number().optional(),
  pourcentage_conjoint: z.number().optional(),
  valeur_acquisition: z.number().optional(),
  frais_acquisition: z.number().optional(),
  date_acquisition: z.date().optional()
});
type AssetFormValues = z.infer<typeof assetSchema>;
interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: AssetFormValues, charges: AssetCharge[]) => Promise<void>;
  onCancel: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}
export const AssetForm: React.FC<AssetFormProps> = ({
  asset,
  onSubmit,
  onCancel,
  onDelete
}) => {
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<AssetCharge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detenteurOptions, setDetenteurOptions] = useState<string[]>([]);
  const [familyData, setFamilyData] = useState<{
    userFirstName?: string;
    partnerFirstName?: string;
    hasPartner: boolean;
  }>({ hasPartner: false });

  // Load family data to get real names
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const [familyProfile, maritalStatus] = await Promise.all([
          familyService.getFamilyProfile(),
          familyService.getMaritalStatus()
        ]);

        const options: string[] = [];
        const familyInfo = { hasPartner: false, userFirstName: '', partnerFirstName: '' };
        
        // Add user's first name
        if (familyProfile?.prenom) {
          options.push(familyProfile.prenom);
          familyInfo.userFirstName = familyProfile.prenom;
        }

        // Check if user has partner (married, pacsé or concubinage)
        const hasPartner = maritalStatus?.statut_couple && 
            ['Marié(e)', 'Pacsé(e)', 'Concubinage', 'MARIE', 'PACS', 'PACSE', 'CONCUBINAGE'].includes(maritalStatus.statut_couple) &&
            maritalStatus.prenom_conjoint;

        if (hasPartner) {
          options.push(maritalStatus.prenom_conjoint);
          familyInfo.hasPartner = true;
          familyInfo.partnerFirstName = maritalStatus.prenom_conjoint;
        }

        // Always add "Le couple" option if there's a partner
        if (familyInfo.hasPartner) {
          options.push('Le couple');
        }

        setDetenteurOptions(options);
        setFamilyData(familyInfo);
      } catch (error) {
        console.error('Error loading family data:', error);
        // Fallback to generic options
        setDetenteurOptions(['Utilisateur']);
      }
    };

    loadFamilyData();
  }, []);
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: asset ? {
      nature: asset.nature,
      denomination: asset.denomination || '',
      mode_detention: asset.mode_detention || '',
      valeur_estimee: asset.valeur_estimee || undefined,
      date_estimation: asset.date_estimation ? new Date(asset.date_estimation) : undefined,
      revalorisation_annuelle: asset.revalorisation_annuelle || undefined,
      detenteur: asset.detenteur || '',
      pourcentage_utilisateur: asset.pourcentage_utilisateur || 50,
      pourcentage_conjoint: asset.pourcentage_conjoint || 50,
      valeur_acquisition: asset.valeur_acquisition || undefined,
      frais_acquisition: asset.frais_acquisition || undefined,
      date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined
    } : {
      nature: '',
      denomination: '',
      mode_detention: '',
      detenteur: '',
      pourcentage_utilisateur: 50,
      pourcentage_conjoint: 50
    }
  });
  const handleSubmit = async (values: AssetFormValues) => {
    setIsLoading(true);
    try {
      const formattedValues = {
        ...values,
        date_estimation: values.date_estimation ? format(values.date_estimation, 'yyyy-MM-dd') : undefined,
        date_acquisition: values.date_acquisition ? format(values.date_acquisition, 'yyyy-MM-dd') : undefined
      };
      await onSubmit(formattedValues as any, charges);
    } finally {
      setIsLoading(false);
    }
  };
  const handleChargeSubmit = (chargeData: any) => {
    if (editingCharge) {
      setCharges(prev => prev.map(c => c.id === editingCharge.id ? {
        ...editingCharge,
        ...chargeData
      } : c));
      setEditingCharge(null);
    } else {
      const newCharge: AssetCharge = {
        id: `temp-${Date.now()}`,
        asset_id: asset?.id || '',
        ...chargeData
      };
      setCharges(prev => [...prev, newCharge]);
    }
    setShowChargeForm(false);
  };
  const handleChargeDelete = (chargeId: string) => {
    setCharges(prev => prev.filter(c => c.id !== chargeId));
  };
  const handleChargeEdit = (charge: AssetCharge) => {
    setEditingCharge(charge);
    setShowChargeForm(true);
  };
  const handleDelete = async () => {
    if (asset?.id && onDelete && window.confirm('Êtes-vous sûr de vouloir supprimer cet actif ? Cette action est irréversible.')) {
      setIsLoading(true);
      try {
        await onDelete(asset.id);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return <div className="space-y-6">
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
                  <FormField control={form.control} name="nature" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Nature *</FormLabel>
                        <FormControl>
                          <SearchableSelect options={ASSET_NATURES} value={field.value} onChange={field.onChange} placeholder="Choisir une nature" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="mode_detention" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Mode de détention</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un mode de détention" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pleine propriété">Pleine propriété</SelectItem>
                            <SelectItem value="Usufruit">Usufruit</SelectItem>
                            <SelectItem value="Nue-propriété">Nue-propriété</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="valeur_estimee" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Valeur estimée (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="date_estimation" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Date d'estimation</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="denomination" render={({
                  field
                }) => <FormItem className="md:col-span-2">
                        <FormLabel>Dénomination</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                </div>
              </div>

              <Separator />

              {/* Section 2: Détenteur */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Détenteur</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="detenteur" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Détenteur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg">
                              <SelectValue placeholder="Choisir un détenteur" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {detenteurOptions.map(option => <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  {/* Pourcentages si "Le couple" est sélectionné */}
                  {form.watch('detenteur') === 'Le couple' && familyData.hasPartner && (
                    <>
                      <FormField control={form.control} name="pourcentage_utilisateur" render={({
                        field
                      }) => (
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
                                // Auto-adjust partner percentage
                                form.setValue('pourcentage_conjoint', 100 - value);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="pourcentage_conjoint" render={({
                        field
                      }) => (
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
                                // Auto-adjust user percentage
                                form.setValue('pourcentage_utilisateur', 100 - value);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </>
                  )}

                  <FormField control={form.control} name="date_acquisition" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Date d'acquisition</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="valeur_acquisition" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Valeur d'acquisition (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="frais_acquisition" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Frais d'acquisition (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
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

                {charges.length > 0 && <div className="space-y-2">
                    {charges.map(charge => <Card key={charge.id} className="p-4">
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
                      </Card>)}
                  </div>}
              </div>

              <div className="flex justify-between">
                {asset?.id && onDelete && <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                    Supprimer l'actif
                  </Button>}
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
      {showChargeForm && <ChargeForm charge={editingCharge || undefined} onSubmit={handleChargeSubmit} onCancel={() => {
      setShowChargeForm(false);
      setEditingCharge(null);
    }} />}
    </div>;
};