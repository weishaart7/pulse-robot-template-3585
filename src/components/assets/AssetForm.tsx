import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { ASSET_NATURES, ASSET_CATEGORIES, getAssetCategory } from '@/constants/assetTypes';
import { familyService } from '@/services/familyService';

// Constantes pour les nouveaux champs
const ORIGINE_ACTIF_OPTIONS = [
  'Acquisition à titre gratuite',
  'Acquisition à titre onéreuse',
  'Acquisition par occupation',
  'Création',
  'Découverte',
  'Donation',
  'Échange',
  'Héritage',
  'Présent d\'usage'
] as const;

const SITUATION_PARTICULIERE_OPTIONS = [
  'Antichrèse',
  'Gage',
  'Hypothèque',
  'Indivision',
  'Nantissement',
  'Non',
  'Saisie conservatoire'
] as const;

// Types d'actifs qui nécessitent le champ "Établissement"
const NATURES_WITH_ETABLISSEMENT = [
  'Objets numériques (NFT, etc.)',
  ...ASSET_CATEGORIES['épargne retraite et prévoyance'],
  ...ASSET_CATEGORIES['épargne et assurance-vie'],
  ...ASSET_CATEGORIES['épargne salariale'],
  ...ASSET_CATEGORIES['épargne bancaire / liquidités'],
  ...ASSET_CATEGORIES['valeurs mobilières et placements financiers']
];

const assetSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  denomination: z.string().optional(),
  etablissement: z.string().optional(),
  mode_detention: z.string().optional(),
  valeur_estimee: z.number().optional(),
  date_estimation: z.date().optional(),
  revalorisation_annuelle: z.number().optional(),
  detenteur: z.string().optional(),
  pourcentage_utilisateur: z.number().optional(),
  pourcentage_conjoint: z.number().optional(),
  valeur_acquisition: z.number().optional(),
  frais_acquisition: z.number().optional(),
  date_acquisition: z.date().optional(),
  origine_actif: z.array(z.string()).optional(),
  situation_particuliere: z.array(z.string()).optional(),
  attachement_emotionnel: z.number().min(0).max(10).optional()
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

  // Mapping functions for detenteur values
  const mapDetenteurToDisplay = (dbValue: string, familyData: any): string => {
    switch (dbValue) {
      case 'user':
      case 'utilisateur':
        return familyData.userFirstName || 'Vous';
      case 'spouse':
      case 'conjoint':
        return familyData.partnerFirstName || 'Conjoint';
      case 'common':
      case 'commun':
      case 'couple':
        return 'Le couple';
      default:
        return dbValue;
    }
  };

  const mapDetenteurToDb = (displayValue: string, familyData: any): string => {
    if (displayValue === familyData.userFirstName || displayValue === 'Vous') {
      return 'user';
    }
    if (displayValue === familyData.partnerFirstName || displayValue === 'Conjoint') {
      return 'spouse';
    }
    if (displayValue === 'Le couple') {
      return 'common';
    }
    return displayValue;
  };

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
        // Fallback to generic options - no sensitive data logged
        setDetenteurOptions(['Utilisateur']);
      }
    };

    loadFamilyData();
  }, []);
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      nature: '',
      denomination: '',
      etablissement: '',
      mode_detention: '',
      detenteur: '',
      pourcentage_utilisateur: 50,
      pourcentage_conjoint: 50,
      origine_actif: ['Acquisition à titre onéreuse'],
      situation_particuliere: ['Non'],
      attachement_emotionnel: 0
    }
  });

  // Update form values when family data is loaded and asset is provided
  useEffect(() => {
    if (asset && familyData.userFirstName) {
      const displayDetenteur = mapDetenteurToDisplay(asset.detenteur || '', familyData);
      form.reset({
        nature: asset.nature,
        denomination: asset.denomination || '',
        etablissement: asset.etablissement || '',
        mode_detention: asset.mode_detention || '',
        valeur_estimee: asset.valeur_estimee || undefined,
        date_estimation: asset.date_estimation ? new Date(asset.date_estimation) : undefined,
        revalorisation_annuelle: asset.revalorisation_annuelle || undefined,
        detenteur: displayDetenteur,
        pourcentage_utilisateur: asset.pourcentage_utilisateur || 50,
        pourcentage_conjoint: asset.pourcentage_conjoint || 50,
        valeur_acquisition: asset.valeur_acquisition || undefined,
        frais_acquisition: asset.frais_acquisition || undefined,
        date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined,
        origine_actif: (asset as any).origine_actif || ['Acquisition à titre onéreuse'],
        situation_particuliere: (asset as any).situation_particuliere || ['Non'],
        attachement_emotionnel: (asset as any).attachement_emotionnel || 0
      });
    }
  }, [asset, familyData, form]);
  const handleSubmit = async (values: AssetFormValues) => {
    setIsLoading(true);
    try {
      // Convert display values to database values
      const dbDetenteur = mapDetenteurToDb(values.detenteur || '', familyData);
      
      const formattedValues = {
        ...values,
        detenteur: dbDetenteur,
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
                            <SelectTrigger size="lg">
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
                }) => <FormItem>
                        <FormLabel>Dénomination</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  {/* Champ Établissement conditionnel */}
                  {NATURES_WITH_ETABLISSEMENT.includes(form.watch('nature')) && (
                    <FormField control={form.control} name="etablissement" render={({
                      field
                    }) => <FormItem>
                          <FormLabel>Établissement</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  )}

                </div>

                {/* Origine de l'actif */}
                <FormField
                  control={form.control}
                  name="origine_actif"
                  render={() => (
                    <FormItem>
                      <FormLabel>Origine de l'actif</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ORIGINE_ACTIF_OPTIONS.map((option) => (
                          <FormField
                            key={option}
                            control={form.control}
                            name="origine_actif"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, option]);
                                      } else {
                                        field.onChange(currentValue.filter((val) => val !== option));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {option}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Situation particulière */}
                <FormField
                  control={form.control}
                  name="situation_particuliere"
                  render={() => (
                    <FormItem>
                      <FormLabel>Situation particulière</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SITUATION_PARTICULIERE_OPTIONS.map((option) => (
                          <FormField
                            key={option}
                            control={form.control}
                            name="situation_particuliere"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, option]);
                                      } else {
                                        field.onChange(currentValue.filter((val) => val !== option));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {option}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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