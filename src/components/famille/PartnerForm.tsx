import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ActionHubInput from "@/components/ui/action-hub-input";
import SelectMenu from "@/components/ui/select-menu";
import NationalitySelect from "@/components/ui/nationality-select";
import { Loader2, User, MapPin, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SmartDateInput } from "@/components/family/SmartDateInput";
import { CheckboxWithLabel } from "@/components/family/CheckboxWithLabel";

const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']).optional(),

  civilitePartenaire: z.enum(['M.', 'Mme', 'Mlle', 'Autre']).optional(),
  nomPartenaire: z.string().optional(),
  nomJeuneFillePartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  lieuNaissancePartenaire: z.string().optional(),
  paysNaissancePartenaire: z.string().optional(),
  professionCSP: z.string().optional(),
  professionLibelle: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
  capaciteJuridique: z.enum([
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    "Mesure d'accompagnement",
  ]).default('Aucune'),
  personneHandicapee: z.boolean().default(false),
  residenceFiscaleEtrangerPartenaire: z.boolean().default(false),
  mandatProtectionFuture: z.boolean().default(false),
  dateMandatProtectionFuture: z.union([z.date(), z.literal(''), z.undefined()]).optional(),

  telephonePartenaire: z.string().optional(),
  emailPartenaire: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  adressePartenaire: z.string().optional(),
  codePostalPartenaire: z.string().optional(),
  villePartenaire: z.string().optional(),
  paysPartenaire: z.string().optional(),
}).superRefine((data, ctx) => {
  // Mêmes champs obligatoires que la Fiche client (FicheClientForm), mais
  // uniquement quand le partenaire est réellement présent dans le foyer —
  // ces champs ne sont d'ailleurs rendus dans le formulaire que dans ce cas.
  const requiresPartnerFields = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(data.statutCouple ?? '');
  if (!requiresPartnerFields) return;

  if (!data.civilitePartenaire) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['civilitePartenaire'], message: 'Veuillez sélectionner une civilité' });
  }
  if (!data.nomPartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nomPartenaire'], message: 'Le nom est obligatoire' });
  }
  if (!data.prenomPartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prenomPartenaire'], message: 'Le prénom est obligatoire' });
  }
  if (!data.dateNaissancePartenaire) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateNaissancePartenaire'], message: 'La date de naissance est obligatoire' });
  }
  if (!data.lieuNaissancePartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lieuNaissancePartenaire'], message: 'La commune de naissance est obligatoire' });
  }
  if (!data.paysNaissancePartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paysNaissancePartenaire'], message: 'Le pays de naissance est obligatoire' });
  }
  if (!data.nationalitePartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nationalitePartenaire'], message: 'La nationalité est obligatoire' });
  }
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

export function PartnerForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: maritalData, loading, saving, setStatutCouple } = useMaritalStatus();
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personneHandicapee: false,
      residenceFiscaleEtrangerPartenaire: false,
      capaciteJuridique: 'Aucune',
      mandatProtectionFuture: false,
      civilitePartenaire: undefined,
      nomPartenaire: "",
      nomJeuneFillePartenaire: "",
      prenomPartenaire: "",
      lieuNaissancePartenaire: "",
      paysNaissancePartenaire: "",
      professionCSP: "",
      professionLibelle: "",
      nationalitePartenaire: "",
      telephonePartenaire: "",
      emailPartenaire: "",
      adressePartenaire: "",
      codePostalPartenaire: "",
      villePartenaire: "",
      paysPartenaire: "",
    },
  });

  const statutCouple = useWatch({ control: form.control, name: "statutCouple" });

  useEffect(() => {
    if (maritalData) {
      form.reset({
        statutCouple: maritalData.statut_couple as any,
        civilitePartenaire: maritalData.civilite_conjoint as any,
        nomPartenaire: maritalData.nom_conjoint || "",
        nomJeuneFillePartenaire: maritalData.nom_jeune_fille_conjoint || "",
        prenomPartenaire: maritalData.prenom_conjoint || "",
        dateNaissancePartenaire: maritalData.date_naissance_conjoint ? new Date(maritalData.date_naissance_conjoint) : undefined,
        lieuNaissancePartenaire: maritalData.lieu_naissance_conjoint || "",
        paysNaissancePartenaire: maritalData.pays_naissance_conjoint || "",
        professionCSP: maritalData.profession_csp_conjoint || "",
        professionLibelle: maritalData.profession_conjoint || "",
        nationalitePartenaire: maritalData.nationalite_conjoint || "",
        capaciteJuridique: (maritalData.capacite_juridique_conjoint as FormData['capaciteJuridique']) || 'Aucune',
        personneHandicapee: maritalData.personne_handicapee_conjoint || false,
        residenceFiscaleEtrangerPartenaire: maritalData.residence_fiscale_etranger_conjoint || false,
        mandatProtectionFuture: maritalData.mandat_protection_future_conjoint || false,
        dateMandatProtectionFuture: maritalData.date_mandat_protection_future_conjoint ? new Date(maritalData.date_mandat_protection_future_conjoint) : undefined,
        telephonePartenaire: maritalData.telephone_conjoint || "",
        emailPartenaire: maritalData.email_conjoint || "",
        adressePartenaire: maritalData.adresse_conjoint || "",
        codePostalPartenaire: maritalData.code_postal_conjoint || "",
        villePartenaire: maritalData.ville_conjoint || "",
        paysPartenaire: maritalData.pays_conjoint || "",
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      const supabaseData = {
        civilite_conjoint: formData.civilitePartenaire,
        nom_conjoint: formData.nomPartenaire,
        nom_jeune_fille_conjoint: formData.nomJeuneFillePartenaire,
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire instanceof Date ? format(formData.dateNaissancePartenaire, 'yyyy-MM-dd') : undefined,
        lieu_naissance_conjoint: formData.lieuNaissancePartenaire,
        pays_naissance_conjoint: formData.paysNaissancePartenaire,
        profession_csp_conjoint: formData.professionCSP || '',
        profession_conjoint: formData.professionCSP === 'Autre' ? (formData.professionLibelle?.trim() || '') : '',
        nationalite_conjoint: formData.nationalitePartenaire,
        personne_handicapee_conjoint: formData.personneHandicapee,
        residence_fiscale_etranger_conjoint: formData.residenceFiscaleEtrangerPartenaire,
        capacite_juridique_conjoint: formData.capaciteJuridique,
        mandat_protection_future_conjoint: formData.mandatProtectionFuture,
        date_mandat_protection_future_conjoint: formData.dateMandatProtectionFuture instanceof Date ? format(formData.dateMandatProtectionFuture, 'yyyy-MM-dd') : undefined,
        telephone_conjoint: formData.telephonePartenaire,
        email_conjoint: formData.emailPartenaire,
        adresse_conjoint: formData.adressePartenaire,
        code_postal_conjoint: formData.codePostalPartenaire,
        ville_conjoint: formData.villePartenaire,
        pays_conjoint: formData.paysPartenaire,
      };

      await setStatutCouple(formData.statutCouple ?? null, supabaseData);
      toast({ title: "Succès", description: "Les informations ont été sauvegardées avec succès." });
      onSuccess?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
      toast({ title: "Erreur", description: "Une erreur est survenue lors de la sauvegarde.", variant: "destructive" });
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

  const showPartnerFields =
    statutCouple === "Concubinage" || statutCouple === "Pacsé(e)" || statutCouple === "Marié(e)";

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
                  ? "bg-[#62706d] text-[#ebf1f1] shadow-sm"
                  : "bg-[#ebf1f1] text-[#62706d] hover:opacity-90"
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
            {/* Statut & Identité card */}
            <div className="rounded-md border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identité</h3>

              {!showPartnerFields && (
                <div className="flex items-start gap-3 rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-3">
                    <p>
                      Le statut matrimonial n'est pas encore renseigné. Rendez-vous sur la fiche personnelle
                      (onglet « Ma famille ») pour définir un statut de couple (Concubinage, Pacsé(e) ou Marié(e))
                      avant de saisir les informations du partenaire.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard/famille')}>
                      Aller à la fiche personnelle
                    </Button>
                  </div>
                </div>
              )}

              {showPartnerFields && (
                <>
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
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
                                <RadioGroupItem value={option.value} id={`civ-p-${option.value}`} />
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
                      name="nomPartenaire"
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

                    {(form.watch('civilitePartenaire') === 'Mme' || form.watch('civilitePartenaire') === 'Mlle' || form.watch('civilitePartenaire') === 'Autre') && (
                      <FormField
                        control={form.control}
                        name="nomJeuneFillePartenaire"
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
                      name="prenomPartenaire"
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
                      name="dateNaissancePartenaire"
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
                </>
              )}
            </div>

            {showPartnerFields && (
              <>
                {/* Profession & Naissance card */}
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profession & Naissance</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <FormField
                      control={form.control}
                      name="professionCSP"
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

                    {form.watch('professionCSP') === 'Autre' && (
                      <FormField
                        control={form.control}
                        name="professionLibelle"
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
                      name="lieuNaissancePartenaire"
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
                      name="paysNaissancePartenaire"
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
                      name="nationalitePartenaire"
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
                <div className="rounded-md border bg-card p-6 shadow-sm">
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
                      name="personneHandicapee"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Personne handicapée" />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residenceFiscaleEtrangerPartenaire"
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
              </>
            )}
          </div>
        )}

        {/* Coordonnées */}
        {activeSection === 'coordonnees' && (
          <div className="space-y-6">
            <div className="rounded-md border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contact</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="telephonePartenaire"
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
                  name="emailPartenaire"
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

            <div className="rounded-md border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Adresse</h3>

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="adressePartenaire"
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
                    name="codePostalPartenaire"
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
                    name="villePartenaire"
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
                    name="paysPartenaire"
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
