import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, User, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import ActionHubInput from '@/components/ui/action-hub-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SelectMenu from '@/components/ui/select-menu';
import NationalitySelect from '@/components/ui/nationality-select';
import { cn } from '@/lib/utils';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeTextInput, isValidEmail, isValidDate } from '@/lib/security';


const formSchema = z.object({
  civilite: z.enum(['M', 'Mme', 'Autre'], {
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
  capaciteJuridique: z.enum(['normale', 'curatelle', 'tutelle', 'sauvegarde'], {
    required_error: 'Veuillez sélectionner une capacité juridique',
  }),
  handicape: z.boolean().default(false),
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
  const { user } = useAuth();
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
      professionLibre: '',
      communeNaissance: '',
      paysNaissance: '',
      nationalite: '',
      capaciteJuridique: 'normale',
      handicape: false,
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
      
      const formattedData = {
        civilite: (data.civility as 'M' | 'Mme' | 'Autre') || undefined,
        nom: data.nom ? unescapeHtml(data.nom) : '',
        nomJeuneFille: (data as any).nom_jeune_fille ? unescapeHtml((data as any).nom_jeune_fille) : '',
        prenom: data.prenom ? unescapeHtml(data.prenom) : '',
        dateNaissance: data.date_naissance ? new Date(data.date_naissance) : undefined,
        profession: isPredefinedProfession ? rawProfession : '',
        professionLibre: !isPredefinedProfession ? rawProfession : '',
        communeNaissance: data.commune_naissance || '',
        paysNaissance: data.pays_naissance || '',
        nationalite: data.nationalite || '',
        capaciteJuridique: (data.capacite_juridique as 'normale' | 'curatelle' | 'tutelle' | 'sauvegarde') || 'normale',
        handicape: data.personne_handicapee || false,
        telephone: data.telephone || '',
        email: data.email || '',
        adresse: data.adresse_postale || '',
        codePostal: data.code_postal || '',
        ville: data.ville || '',
        pays: data.pays || '',
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

      // Validate email if provided
      if (formData.email && !isValidEmail(formData.email)) {
        throw new Error('Format d\'email invalide');
      }

      const professionFinale = formData.professionLibre?.trim() || '';
      
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
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
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
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
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
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identité</h3>
              
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
                          { value: 'M', label: 'M.' },
                          { value: 'Mme', label: 'Mme' },
                          { value: 'Autre', label: 'Autre' },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-200",
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

                {(form.watch('civilite') === 'Mme' || form.watch('civilite') === 'Autre') && (
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
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder="JJ/MM/AAAA"
                              className="bg-muted border-transparent shadow-none rounded focus-visible:bg-background focus-visible:border-ring"
                              value={field.value instanceof Date ? format(field.value, 'dd/MM/yyyy') : field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                  try {
                                    const [day, month, year] = value.split('/');
                                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                    if (!isNaN(date.getTime())) {
                                      field.onChange(date);
                                      return;
                                    }
                                  } catch (error) {}
                                }
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value instanceof Date ? field.value : undefined}
                                onSelect={(date) => date && field.onChange(date)}
                                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Profession & Naissance card */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profession & Naissance</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <FormField
                  control={form.control}
                  name="professionLibre"
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
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Situation juridique</h3>
              
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
                            <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded focus-visible:bg-background focus-visible:border-ring">
                              <SelectValue placeholder="Sélectionner la capacité juridique" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normale">Normale</SelectItem>
                            <SelectItem value="curatelle">Curatelle</SelectItem>
                            <SelectItem value="tutelle">Tutelle</SelectItem>
                            <SelectItem value="sauvegarde">Sauvegarde de justice</SelectItem>
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
                    <FormItem className="pb-1">
                      <FormControl>
                        <label className="flex gap-3 items-center cursor-pointer relative">
                          <input 
                            type="checkbox" 
                            className="hidden peer" 
                            checked={field.value}
                            onChange={field.onChange}
                          />
                          <span className="w-5 h-5 border border-input rounded relative flex items-center justify-center peer-checked:border-primary"></span>
                          <svg className="absolute hidden peer-checked:inline left-1 top-1/2 transform -translate-y-1/2" width="11" height="8" viewBox="0 0 11 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="m10.092.952-.005-.006-.006-.005A.45.45 0 0 0 9.43.939L4.162 6.23 1.585 3.636a.45.45 0 0 0-.652 0 .47.47 0 0 0 0 .657l.002.002L3.58 6.958a.8.8 0 0 0 .567.242.78.78 0 0 0 .567-.242l5.333-5.356a.474.474 0 0 0 .044-.65Zm-5.86 5.349V6.3Z" fill="currentColor" stroke="currentColor" strokeWidth=".4" className="text-primary"/>
                          </svg>
                          <span className="text-foreground select-none text-sm">Personne handicapée</span>
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Coordonnées */}
        {activeSection === 'coordonnees' && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contact</h3>
              
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

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Adresse</h3>
              
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