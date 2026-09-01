import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, User, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import ActionHubInput from '@/components/ui/action-hub-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import SelectMenu from '@/components/ui/select-menu';
import NationalitySelect from '@/components/ui/nationality-select';
import { cn } from '@/lib/utils';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeTextInput, isValidEmail, isValidDate } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { CheckboxWithLabel } from '@/components/family/CheckboxWithLabel';


const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']).optional(),
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
  professionLibre: z.string().optional(),
  communeNaissance: z.string().min(1, 'La commune de naissance est obligatoire'),
  paysNaissance: z.string().min(1, 'Le pays de naissance est obligatoire'),
  nationalite: z.string().min(1, 'La nationalité est obligatoire'),
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
  telephone: z.string().optional(),
  email: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const professions = [
  'Agriculteur exploitant',
  'Artisan, commerçant, chef d\'entreprise',
  'Cadre, profession intellectuelle supérieure',
  'Profession intermédiaire',
  'Employé',
  'Ouvrier',
  'Retraité',
  'Sans activité professionnelle',
  'Autre',
];

type Section = 'informations-generales' | 'coordonnees';

export function FicheClientForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');
  const { data, loading, saving, saveData } = useFamilyProfile();
  const { data: maritalData, setStatutCouple } = useMaritalStatus();
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
      statutCouple: undefined,
      civilite: undefined,
      nom: '',
      nomJeuneFille: '',
      prenom: '',
      dateNaissance: undefined,
      profession: '',
      professionLibre: '',
      communeNaissance: '',
      paysNaissance: '',
      nationalite: '',
      capaciteJuridique: 'Aucune',
      handicape: false,
      mandatProtectionFuture: false,
      telephone: '',
      email: '',
      adresse: '',
      codePostal: '',
      ville: '',
      pays: '',
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
      const isPredefinedProfession = rawProfession && professions.includes(rawProfession);

      // Compat. fiches existantes enregistrées avant l'ajout du point ('M' -> 'M.')
      const rawCivilite = data.civility === 'M' ? 'M.' : data.civility;

      const formattedData = {
        statutCouple: (maritalData?.statut_couple as any) || undefined,
        civilite: (rawCivilite as 'M.' | 'Mme' | 'Mlle' | 'Autre') || undefined,
        nom: data.nom ? unescapeHtml(data.nom) : '',
        nomJeuneFille: (data as any).nom_jeune_fille ? unescapeHtml((data as any).nom_jeune_fille) : '',
        prenom: data.prenom ? unescapeHtml(data.prenom) : '',
        dateNaissance: data.date_naissance ? new Date(data.date_naissance) : undefined,
        profession: isPredefinedProfession ? rawProfession : '',
        professionLibre: !isPredefinedProfession ? rawProfession : '',
        communeNaissance: data.commune_naissance || '',
        paysNaissance: data.pays_naissance || '',
        nationalite: data.nationalite || '',
        capaciteJuridique: (data.capacite_juridique as FormData['capaciteJuridique']) || 'Aucune',
        handicape: data.personne_handicapee || false,
        residenceFiscaleEtranger: data.residence_fiscale_etranger || false,
        mandatProtectionFuture: data.mandat_protection_future || false,
        dateMandatProtectionFuture: data.date_mandat_protection_future ? new Date(data.date_mandat_protection_future) : undefined,
        telephone: data.telephone || '',
        email: data.email || '',
        adresse: data.adresse_postale || '',
        codePostal: data.code_postal || '',
        ville: data.ville || '',
        pays: data.pays || '',
      };
      form.reset(formattedData);
    }
  }, [data, maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      // Convert string date to Date if needed  
      let dateNaissance = formData.dateNaissance;
      if (typeof dateNaissance === 'string') {
        const [day, month, year] = dateNaissance.split('/');
        dateNaissance = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Validate email if provided
      if (formData.email && !isValidEmail(formData.email)) {
        throw new Error('Format d\'email invalide');
      }

      const professionFinale = formData.profession === 'Autre'
        ? (formData.professionLibre?.trim() || '')
        : (formData.profession || '');
      
      const sanitizedFormData = {
        civilite: formData.civilite,
        nom: formData.nom,
        nomJeuneFille: formData.nomJeuneFille,
        prenom: formData.prenom,
        dateNaissance,
        profession: professionFinale,
        communeNaissance: formData.communeNaissance,
        paysNaissance: formData.paysNaissance,
        nationalite: formData.nationalite,
        capaciteJuridique: formData.capaciteJuridique,
        handicape: formData.handicape,
        residenceFiscaleEtranger: formData.residenceFiscaleEtranger,
        mandatProtectionFuture: formData.mandatProtectionFuture,
        dateMandatProtectionFuture: formData.dateMandatProtectionFuture,
        telephone: formData.telephone || '',
        email: formData.email || '',
        adresse: formData.adresse || '',
        codePostal: formData.codePostal || '',
        ville: formData.ville || '',
        pays: formData.pays || '',
      };

      const supabaseData = {
        civility: sanitizedFormData.civilite,
        nom: sanitizedFormData.nom,
        nom_jeune_fille: sanitizedFormData.nomJeuneFille,
        prenom: sanitizedFormData.prenom,
        date_naissance: sanitizedFormData.dateNaissance instanceof Date ? format(sanitizedFormData.dateNaissance, 'yyyy-MM-dd') : undefined,
        profession: sanitizedFormData.profession,
        commune_naissance: sanitizedFormData.communeNaissance,
        pays_naissance: sanitizedFormData.paysNaissance,
        nationalite: sanitizedFormData.nationalite,
        capacite_juridique: sanitizedFormData.capaciteJuridique,
        personne_handicapee: sanitizedFormData.handicape,
        residence_fiscale_etranger: sanitizedFormData.residenceFiscaleEtranger,
        mandat_protection_future: sanitizedFormData.mandatProtectionFuture,
        date_mandat_protection_future: sanitizedFormData.dateMandatProtectionFuture instanceof Date ? format(sanitizedFormData.dateMandatProtectionFuture, 'yyyy-MM-dd') : undefined,
        telephone: sanitizedFormData.telephone,
        email: sanitizedFormData.email,
        adresse_postale: sanitizedFormData.adresse,
        code_postal: sanitizedFormData.codePostal,
        ville: sanitizedFormData.ville,
        pays: sanitizedFormData.pays,
      };

      await submitSecureForm(
        supabaseData,
        async (sanitizedData) => {
          await saveData(sanitizedData);
        },
        user?.id
      );
      await setStatutCouple(formData.statutCouple ?? null);
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

  const sections = [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: User },
    { id: 'coordonnees' as Section, label: 'Coordonnées', icon: MapPin },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section navigation pills */}
        <div className="flex gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-[50px] text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bf00b] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                activeSection === section.id
                  ? "bg-[#9bf00b] text-[#262626] shadow-sm"
                  : "bg-[#F2F2F2] text-[#616161] hover:opacity-90"
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Informations générales */}
        {activeSection === 'informations-generales' && (
          <div className="space-y-6">
            {/* Civilité card */}
            <div className="rounded-[4px] bg-white p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] mb-4" style={{ color: '#616161', fontFamily: "'JetBrains Mono', monospace" }}>Identité</h3>

              <FormField
                control={form.control}
                name="statutCouple"
                render={({ field }) => (
                  <FormItem className="mb-5 max-w-md">
                    <div className="relative w-full flex flex-col gap-1">
                      <FormLabel className="text-xs">Statut matrimonial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                            <SelectValue placeholder="Choisir un statut" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Célibataire">Célibataire</SelectItem>
                          <SelectItem value="Concubinage">Concubinage</SelectItem>
                          <SelectItem value="Pacsé(e)">Pacsé(e)</SelectItem>
                          <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                          <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                          <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem className="space-y-2 mb-5">
                    <FormLabel className="text-xs">
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
                        <FormLabel className="text-xs">
                          Date de naissance <span className="text-destructive">*</span>
                        </FormLabel>
                        <SmartDateInput
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Profession & Naissance card */}
            <div className="rounded-[4px] bg-white p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] mb-4" style={{ color: '#616161', fontFamily: "'JetBrains Mono', monospace" }}>Profession & Naissance</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel className="text-xs">Profession</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                              <SelectValue placeholder="Sélectionner une profession" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {professions.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('profession') === 'Autre' && (
                  <FormField
                    control={form.control}
                    name="professionLibre"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <ActionHubInput
                            label="Précisez la profession"
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
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="communeNaissance"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Commune de naissance"
                          placeholder="Commune de naissance"
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
                  name="paysNaissance"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel className="text-xs">
                          Pays de naissance <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <SelectMenu
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Sélectionner un pays"
                          />
                        </FormControl>
                      </div>
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
                        <FormLabel className="text-xs">
                          Nationalité <span className="text-destructive">*</span>
                        </FormLabel>
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
            </div>

            {/* Situation juridique card */}
            <div className="rounded-[4px] bg-white p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] mb-4" style={{ color: '#616161', fontFamily: "'JetBrains Mono', monospace" }}>Situation juridique</h3>
              
              <div className="flex flex-wrap items-end gap-6">
                <FormField
                  control={form.control}
                  name="capaciteJuridique"
                  render={({ field }) => (
                    <FormItem className="w-72">
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel className="text-xs">Capacité juridique</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
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
                          <FormLabel className="text-xs">Date du mandat</FormLabel>
                          <SmartDateInput
                            value={field.value}
                            onChange={field.onChange}
                            className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
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
        )}

        {/* Coordonnées */}
        {activeSection === 'coordonnees' && (
          <div className="space-y-6">
            <div className="rounded-[4px] bg-white p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] mb-4" style={{ color: '#616161', fontFamily: "'JetBrains Mono', monospace" }}>Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Téléphone"
                          placeholder="Numéro de téléphone"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Adresse email"
                          placeholder="email@exemple.com"
                          type="email"
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
            </div>

            <div className="rounded-[4px] bg-white p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] mb-4" style={{ color: '#616161', fontFamily: "'JetBrains Mono', monospace" }}>Adresse</h3>
              
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <ActionHubInput
                          label="Adresse postale"
                          placeholder="Adresse complète"
                          value={field.value}
                          onChange={field.onChange}
                          historyEnabled={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={form.control}
                    name="codePostal"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <ActionHubInput
                            label="Code postal"
                            placeholder="Code postal"
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
                    name="ville"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <ActionHubInput
                            label="Ville"
                            placeholder="Ville"
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
                    name="pays"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <ActionHubInput
                            label="Pays"
                            placeholder="Pays"
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
              </div>
            </div>
          </div>
        )}

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