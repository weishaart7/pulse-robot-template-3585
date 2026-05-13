import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ActionHubInput from "@/components/ui/action-hub-input";
import SelectMenu from "@/components/ui/select-menu";
import NationalitySelect from "@/components/ui/nationality-select";
import { CalendarIcon, Loader2, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Type étendu pour inclure les nouveaux champs coordonnées
type ExtendedMaritalStatus = {
  telephone_conjoint?: string | null;
  email_conjoint?: string | null;
  adresse_conjoint?: string | null;
  code_postal_conjoint?: string | null;
  ville_conjoint?: string | null;
  pays_conjoint?: string | null;
  [key: string]: any;
};

const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)']).optional(),

  civilitePartenaire: z.enum(['M.', 'Mme', 'Autre']).optional(),
  nomPartenaire: z.string().optional(),
  nomJeuneFillePartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  lieuNaissancePartenaire: z.string().optional(),
  paysNaissancePartenaire: z.string().optional(),
  professionCSP: z.string().optional(),
  professionLibelle: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
  capaciteJuridique: z.enum(['normale', 'curatelle', 'tutelle', 'sauvegarde']).default('normale'),
  personneHandicapee: z.boolean().default(false),

  telephonePartenaire: z.string().optional(),
  emailPartenaire: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  adressePartenaire: z.string().optional(),
  codePostalPartenaire: z.string().optional(),
  villePartenaire: z.string().optional(),
  paysPartenaire: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type Section = 'informations-generales' | 'coordonnees';

export function PartnerForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: maritalData, loading, saving, saveData } = useMaritalStatus();
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personneHandicapee: false,
      capaciteJuridique: 'normale',
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
      const data = maritalData as ExtendedMaritalStatus;
      form.reset({
        statutCouple: data.statut_couple as any,
        civilitePartenaire: data.civilite_conjoint as any,
        nomPartenaire: data.nom_conjoint || "",
        nomJeuneFillePartenaire: (data as any).nom_jeune_fille_conjoint || "",
        prenomPartenaire: data.prenom_conjoint || "",
        dateNaissancePartenaire: data.date_naissance_conjoint ? new Date(data.date_naissance_conjoint) : undefined,
        lieuNaissancePartenaire: data.lieu_naissance_conjoint || "",
        paysNaissancePartenaire: (data as any).pays_naissance_conjoint || "",
        professionCSP: data.profession_csp_conjoint || "",
        professionLibelle: data.profession_conjoint || "",
        nationalitePartenaire: data.nationalite_conjoint || "",
        capaciteJuridique: 'normale',
        personneHandicapee: data.personne_handicapee_conjoint || false,
        telephonePartenaire: data.telephone_conjoint || "",
        emailPartenaire: data.email_conjoint || "",
        adressePartenaire: data.adresse_conjoint || "",
        codePostalPartenaire: data.code_postal_conjoint || "",
        villePartenaire: data.ville_conjoint || "",
        paysPartenaire: data.pays_conjoint || "",
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      const supabaseData = {
        statut_couple: formData.statutCouple,
        civilite_conjoint: formData.civilitePartenaire,
        nom_conjoint: formData.nomPartenaire,
        nom_jeune_fille_conjoint: formData.nomJeuneFillePartenaire,
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire?.toISOString().split('T')[0],
        lieu_naissance_conjoint: formData.lieuNaissancePartenaire,
        pays_naissance_conjoint: formData.paysNaissancePartenaire,
        profession_csp_conjoint: formData.professionCSP,
        profession_conjoint: formData.professionLibelle,
        nationalite_conjoint: formData.nationalitePartenaire,
        personne_handicapee_conjoint: formData.personneHandicapee,
        telephone_conjoint: formData.telephonePartenaire,
        email_conjoint: formData.emailPartenaire,
        adresse_conjoint: formData.adressePartenaire,
        code_postal_conjoint: formData.codePostalPartenaire,
        ville_conjoint: formData.villePartenaire,
        pays_conjoint: formData.paysPartenaire,
      };

      await saveData(supabaseData);
      toast({ title: "Succès", description: "Les informations ont été sauvegardées avec succès." });
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
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
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identité</h3>

              {showPartnerFields && (
                <>
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
                    render={({ field }) => (
                      <FormItem className="space-y-2 mb-5">
                        <FormLabel className="text-xs">Civilité</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-row gap-4"
                          >
                            {[
                              { value: 'M.', label: 'M.' },
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
                              historyEnabled={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(form.watch('civilitePartenaire') === 'Mme' || form.watch('civilitePartenaire') === 'Autre') && (
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
                            <FormLabel className="text-xs">Date de naissance</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  placeholder="JJ/MM/AAAA"
                                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                                  value={field.value instanceof Date ? format(field.value, 'dd/MM/yyyy') : (field.value as any) || ''}
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
                                    field.onChange(value as any);
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
                </>
              )}
            </div>

            {showPartnerFields && (
              <>
                {/* Profession & Naissance card */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profession & Naissance</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <FormField
                      control={form.control}
                      name="professionLibelle"
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
                      name="lieuNaissancePartenaire"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <ActionHubInput
                              label="Commune de naissance"
                              placeholder="Commune de naissance"
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
                      name="paysNaissancePartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel className="text-xs">Pays de naissance</FormLabel>
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
                            <FormLabel className="text-xs">Nationalité</FormLabel>
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
                                <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
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
                      name="personneHandicapee"
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
              </>
            )}
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

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
