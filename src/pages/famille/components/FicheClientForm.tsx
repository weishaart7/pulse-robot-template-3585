import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { User, Briefcase, ShieldCheck } from 'lucide-react';
import { LogoSpinner } from "@/components/brand/LogoSpinner";

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ActionHubInput from '@/components/ui/action-hub-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NationalitySelect from '@/components/ui/nationality-select';
import { cn } from '@/lib/utils';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { CheckboxWithLabel } from '@/components/family/CheckboxWithLabel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';


const formSchema = z.object({
  civilite: z.enum(['M.', 'Mme', 'Mlle', 'Autre'], {
    required_error: 'Veuillez sélectionner une civilité',
  }),
  nom: z.string().min(1, 'Le nom est obligatoire'),
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

interface FicheClientFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
  title: string;
  summary?: string;
}

export function FicheClientForm({ onSuccess, onBack, title, summary }: FicheClientFormProps) {
  const { data, loading, saving, saveData } = useFamilyProfile();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      civilite: undefined,
      nom: '',
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
      // Compat. fiches existantes enregistrées avant l'ajout du point ('M' -> 'M.')
      const rawCivilite = data.civility === 'M' ? 'M.' : data.civility;

      const formattedData = {
        civilite: (rawCivilite as 'M.' | 'Mme' | 'Mlle' | 'Autre') || undefined,
        nom: data.nom || '',
        prenom: data.prenom || '',
        dateNaissance: data.date_naissance ? new Date(data.date_naissance) : undefined,
        profession: data.profession || '',
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
    let dateNaissance = formData.dateNaissance;
    if (typeof dateNaissance === 'string') {
      const [day, month, year] = dateNaissance.split('/');
      dateNaissance = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    try {
      await saveData({
        civility: formData.civilite,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        date_naissance: dateNaissance instanceof Date ? format(dateNaissance, 'yyyy-MM-dd') : undefined,
        profession: formData.profession?.trim() || '',
        nationalite: formData.nationalite,
        nationalite_2: formData.doubleNationalite ? (formData.nationalite2 || '') : '',
        capacite_juridique: formData.capaciteJuridique,
        personne_handicapee: formData.handicape,
        residence_fiscale_etranger: formData.residenceFiscaleEtranger,
        mandat_protection_future: formData.mandatProtectionFuture,
        date_mandat_protection_future: formData.dateMandatProtectionFuture instanceof Date ? format(formData.dateMandatProtectionFuture, 'yyyy-MM-dd') : undefined,
      });
      onSuccess?.();
    } catch (error) {
      // Notification déjà affichée par useFamilyProfile : on reste sur la fiche.
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
    }
  };

  if (loading) {
    return (
      <LoadingSpinner text="Chargement des données..." />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="workspace-panel -mx-4 -mt-3 md:-m-6">
        <WorkspaceHeader
          icon={<User strokeWidth={1.75} />}
          trail={['Famille', 'Foyer', 'Client']}
          actions={
            <>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-8 items-center rounded-[2px] border border-border px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Retour
                </button>
              )}
              <Button type="submit" disabled={saving} size="sm" className="h-8 rounded-[2px] bg-foreground px-3.5 text-[12.5px] text-background hover:opacity-90">
                {saving ? (<><LogoSpinner />Enregistrement...</>) : 'Enregistrer'}
              </Button>
            </>
          }
        />

        <div className="px-8 pt-6 pb-4">
          <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{title}</h1>
          {summary && <p className="mt-1 text-[12.5px] text-muted-foreground">{summary}</p>}
        </div>

        <div className="divide-y divide-border border-t border-border">
            {/* Identité */}
            <div className="px-8 py-6">
              <SectionHeader icon={User} title="Identité" />

              <div className="space-y-5">

              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-start gap-3 space-y-0">
                    <FormLabel>
                      Civilité <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div role="radiogroup" className="inline-grid grid-cols-4 gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]">
                        {['M.', 'Mme', 'Mlle', 'Autre'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={field.value === option}
                            onClick={() => field.onChange(option)}
                            className={cn(
                              "h-8 rounded-[2px] border px-4 text-[12.5px] transition-colors",
                              field.value === option ? "border-foreground bg-foreground text-background" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
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
                          className="bg-background border-border shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              </div>
            </div>

            {/* Profession & Nationalité */}
            <div className="px-8 py-6">
              <SectionHeader icon={Briefcase} title="Profession & Nationalité" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                  <div className="md:self-end">
                    <FormField
                      control={form.control}
                      name="doubleNationalite"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Double nationalité" />
                      )}
                    />
                  </div>
                  {form.watch('doubleNationalite') && (
                    <div className="md:col-start-2">
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
                    </div>
                  )}
                </div>
            </div>

            {/* Situation juridique */}
            <div className="px-8 py-6">
              <SectionHeader icon={ShieldCheck} title="Situation juridique" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={form.control}
                    name="capaciteJuridique"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative w-full flex flex-col gap-1">
                          <FormLabel>Capacité juridique</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md">
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
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-6">
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
                </div>

                {form.watch('mandatProtectionFuture') && (
                  <div className="ml-7 mt-1 grid grid-cols-1 gap-5 border-l border-border pl-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="dateMandatProtectionFuture"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel>Date du mandat</FormLabel>
                            <SmartDateInput
                              value={field.value}
                              onChange={field.onChange}
                              className="bg-background border-border shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
            </div>
          </div>

      </form>
    </Form>
  );
}