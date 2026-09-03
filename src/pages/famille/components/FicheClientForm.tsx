import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import ActionHubInput from '@/components/ui/action-hub-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import NationalitySelect from '@/components/ui/nationality-select';
import { cn } from '@/lib/utils';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { CheckboxWithLabel } from '@/components/family/CheckboxWithLabel';


const formSchema = z.object({
  civilite: z.enum(['M.', 'Mme', 'Mlle', 'Autre'], {
    required_error: 'Veuillez sélectionner une civilité',
  }),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  nomJeuneFille: z.string().optional(),
  prenom: z.string().min(1, 'Le prénom est obligatoire'),
  dateNaissance: z.union([
    z.date(),
    z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Format de date invalide (DD/MM/YYYY)')
  ], {
    required_error: 'La date de naissance est obligatoire',
  }),
  profession: z.string().optional(),
  nationalite: z.string().optional(),
  doubleNationalite: z.boolean().default(false),
  nationalite2: z.string().optional(),
  capaciteJuridique: z.enum([
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    "Mesure d'accompagnement",
  ], {
    required_error: 'Veuillez sélectionner une mesure de protection juridique',
  }),
  handicape: z.boolean().default(false),
  residenceFiscaleEtranger: z.boolean().default(false),
  mandatProtectionFuture: z.boolean().default(false),
  dateMandatProtectionFuture: z.union([z.date(), z.literal(''), z.undefined()]).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function FicheClientForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { data, loading, saving, saveData } = useFamilyProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { submitSecureForm } = useSecureForm({ 
    formName: 'family_profile',
    enableRateLimit: true,
    maxAttempts: 5,
    windowMs: 60000
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      civilite: undefined,
      nom: '',
      nomJeuneFille: '',
      prenom: '',
      dateNaissance: undefined,
      profession: '',
      nationalite: '',
      doubleNationalite: false,
      nationalite2: '',
      capaciteJuridique: 'Aucune',
      handicape: false,
      mandatProtectionFuture: false,
    },
  });

  // Charger les données depuis Supabase
  useEffect(() => {
    if (data) {
      // Unescape HTML entities that may have been stored by sanitizeTextInput
      const unescapeHtml = (str: string) =>
        str
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/');

      const rawProfession = data.profession ? unescapeHtml(data.profession) : '';

      // Compat. fiches existantes enregistrées avant l'ajout du point ('M' -> 'M.')
      const rawCivilite = data.civility === 'M' ? 'M.' : data.civility;

      const formattedData = {
        civilite: (rawCivilite as 'M.' | 'Mme' | 'Mlle' | 'Autre') || undefined,
        nom: data.nom ? unescapeHtml(data.nom) : '',
        nomJeuneFille: (data as any).nom_jeune_fille ? unescapeHtml((data as any).nom_jeune_fille) : '',
        prenom: data.prenom ? unescapeHtml(data.prenom) : '',
        dateNaissance: data.date_naissance ? new Date(data.date_naissance) : undefined,
        profession: rawProfession,
        nationalite: data.nationalite || '',
        doubleNationalite: !!data.nationalite_2,
        nationalite2: data.nationalite_2 || '',
        capaciteJuridique: (data.capacite_juridique as FormData['capaciteJuridique']) || 'Aucune',
        handicape: data.personne_handicapee || false,
        residenceFiscaleEtranger: data.residence_fiscale_etranger || false,
        mandatProtectionFuture: data.mandat_protection_future || false,
        dateMandatProtectionFuture: data.date_mandat_protection_future ? new Date(data.date_mandat_protection_future) : undefined,
      };
      form.reset(formattedData);
    }
  }, [data, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      // Convert string date to Date if needed  
      let dateNaissance = formData.dateNaissance;
      if (typeof dateNaissance === 'string') {
        const [day, month, year] = dateNaissance.split('/');
        dateNaissance = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      const sanitizedFormData = {
        civilite: formData.civilite,
        nom: formData.nom,
        nomJeuneFille: formData.nomJeuneFille,
        prenom: formData.prenom,
        dateNaissance,
        profession: formData.profession?.trim() || '',
        nationalite: formData.nationalite,
        nationalite2: formData.doubleNationalite ? (formData.nationalite2 || '') : '',
        capaciteJuridique: formData.capaciteJuridique,
        handicape: formData.handicape,
        residenceFiscaleEtranger: formData.residenceFiscaleEtranger,
        mandatProtectionFuture: formData.mandatProtectionFuture,
        dateMandatProtectionFuture: formData.dateMandatProtectionFuture,
      };

      const supabaseData = {
        civility: sanitizedFormData.civilite,
        nom: sanitizedFormData.nom,
        nom_jeune_fille: sanitizedFormData.nomJeuneFille,
        prenom: sanitizedFormData.prenom,
        date_naissance: sanitizedFormData.dateNaissance instanceof Date ? format(sanitizedFormData.dateNaissance, 'yyyy-MM-dd') : undefined,
        profession: sanitizedFormData.profession,
        nationalite: sanitizedFormData.nationalite,
        nationalite_2: sanitizedFormData.nationalite2,
        capacite_juridique: sanitizedFormData.capaciteJuridique,
        personne_handicapee: sanitizedFormData.handicape,
        residence_fiscale_etranger: sanitizedFormData.residenceFiscaleEtranger,
        mandat_protection_future: sanitizedFormData.mandatProtectionFuture,
        date_mandat_protection_future: sanitizedFormData.dateMandatProtectionFuture instanceof Date ? format(sanitizedFormData.dateMandatProtectionFuture, 'yyyy-MM-dd') : undefined,
      };

      await submitSecureForm(
        supabaseData,
        async (sanitizedData) => {
          await saveData(sanitizedData);
        },
        user?.id
      );
      toast({ title: "Succès", description: "Les informations ont été sauvegardées avec succès." });
      onSuccess?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
      toast({
        title: "Erreur",
        description: error instanceof Error && error.message
          ? error.message
          : "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-md border bg-card p-6 shadow-sm space-y-6">
            {/* Identité */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identité</h3>

              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem className="space-y-2 mb-5">
                    <FormLabel>
                      Civilité <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-row gap-4"
                      >
                        {[
                          { value: 'M.', label: 'M.' },
                          { value: 'Mme', label: 'Mme' },
                          { value: 'Mlle', label: 'Mlle' },
                          { value: 'Autre', label: 'Autre' },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all duration-200",
                              field.value === option.value
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                            )}
                          >
                            <RadioGroupItem value={option.value} id={`civ-${option.value}`} />
                            <span className="text-sm font-medium">{option.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Nom"
                          placeholder="Nom de famille"
                          value={field.value}
                          onChange={field.onChange}
                          required
                          historyEnabled={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('civilite') === 'Mme' || form.watch('civilite') === 'Mlle' || form.watch('civilite') === 'Autre') && (
                  <FormField
                    control={form.control}
                    name="nomJeuneFille"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <ActionHubInput
                            label="Nom de jeune fille"
                            placeholder="Nom de jeune fille"
                            value={field.value}
                            onChange={field.onChange}
                            historyEnabled={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Prénom"
                          placeholder="Prénom"
                          value={field.value}
                          onChange={field.onChange}
                          required
                          historyEnabled={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateNaissance"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel>
                          Date de naissance <span className="text-destructive">*</span>
                        </FormLabel>
                        <SmartDateInput
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Profession & Naissance */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profession & Naissance</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Profession"
                          placeholder="Profession"
                          value={field.value}
                          onChange={field.onChange}
                          historyEnabled={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="nationalite"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel>Nationalité</FormLabel>
                        <FormControl>
                          <NationalitySelect
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Sélectionner une nationalité"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doubleNationalite"
                  render={({ field }) => (
                    <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Double nationalité" />
                  )}
                />

                {form.watch('doubleNationalite') && (
                  <FormField
                    control={form.control}
                    name="nationalite2"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative w-full flex flex-col gap-1">
                          <FormLabel>Deuxième nationalité</FormLabel>
                          <FormControl>
                            <NationalitySelect
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Sélectionner une nationalité"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Situation juridique */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Situation juridique</h3>

              <div className="flex flex-wrap items-end gap-6">
                <FormField
                  control={form.control}
                  name="capaciteJuridique"
                  render={({ field }) => (
                    <FormItem className="w-72">
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel>Capacité juridique</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
                              <SelectValue placeholder="Sélectionner la capacité juridique" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Aucune">Aucune</SelectItem>
                            <SelectItem value="Tutelle">Tutelle</SelectItem>
                            <SelectItem value="Curatelle">Curatelle</SelectItem>
                            <SelectItem value="Sauvegarde de justice">Sauvegarde de justice</SelectItem>
                            <SelectItem value="Habilitation du conjoint">Habilitation du conjoint</SelectItem>
                            <SelectItem value="Habilitation familiale">Habilitation familiale</SelectItem>
                            <SelectItem value="Mesure d'accompagnement">Mesure d'accompagnement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handicape"
                  render={({ field }) => (
                    <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Personne handicapée" />
                  )}
                />

                <FormField
                  control={form.control}
                  name="residenceFiscaleEtranger"
                  render={({ field }) => (
                    <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Résidence fiscale à l'étranger" />
                  )}
                />

                <FormField
                  control={form.control}
                  name="mandatProtectionFuture"
                  render={({ field }) => (
                    <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Mandat de protection future signé" />
                  )}
                />

                {form.watch('mandatProtectionFuture') && (
                  <FormField
                    control={form.control}
                    name="dateMandatProtectionFuture"
                    render={({ field }) => (
                      <FormItem className="w-72">
                        <div className="relative w-full flex flex-col gap-1">
                          <FormLabel>Date du mandat</FormLabel>
                          <SmartDateInput
                            value={field.value}
                            onChange={field.onChange}
                            className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="min-w-[160px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}