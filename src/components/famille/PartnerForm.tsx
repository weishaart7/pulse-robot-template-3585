import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import SelectMenu from "@/components/ui/select-menu";
import { CalendarIcon, Loader2, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar-form";

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

  const statutCouple = useWatch({
    control: form.control,
    name: "statutCouple"
  });

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
      toast({
        title: "Succès",
        description: "Les informations ont été sauvegardées avec succès.",
      });
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: User },
    { id: 'coordonnees' as Section, label: 'Coordonnées', icon: MapPin },
  ];

  const sidebarLinks = sections.map((section) => ({
    label: section.label,
    id: section.id,
    icon: <section.icon className="h-5 w-5 flex-shrink-0" />
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
        <div className="flex gap-6 mt-6 min-h-0">
          <Sidebar>
            <SidebarBody className="justify-start gap-4">
              <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                <div className="mt-4 flex flex-col gap-2">
                  {sidebarLinks.map((link) => (
                    <SidebarLink
                      key={link.id}
                      link={link}
                      isActive={activeSection === link.id}
                      onClick={() => setActiveSection(link.id as Section)}
                    />
                  ))}
                </div>
              </div>
            </SidebarBody>
          </Sidebar>

          {/* Content */}
          <div className="flex-1 space-y-6">

            {/* Section Informations générales */}
            {activeSection === "informations-generales" && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="statutCouple"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel className="text-xs">Statut matrimonial</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger size="lg">
                              <SelectValue placeholder="Choisir un statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Célibataire">Célibataire</SelectItem>
                            <SelectItem value="Concubinage">Concubinage</SelectItem>
                            <SelectItem value="Pacsé(e)">Pacsé(e)</SelectItem>
                            <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(statutCouple === "Concubinage" ||
                  statutCouple === "Pacsé(e)" ||
                  statutCouple === "Marié(e)") && (
                  <>
                    {/* Civilité */}
                    <FormField
                      control={form.control}
                      name="civilitePartenaire"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Civilité</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-row space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="M." id="m-partenaire" />
                                <label htmlFor="m-partenaire">M.</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Mme" id="mme-partenaire" />
                                <label htmlFor="mme-partenaire">Mme</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Autre" id="autre-partenaire" />
                                <label htmlFor="autre-partenaire">Autre</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nom / Nom de jeune fille / Prénom / Date de naissance */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="nomPartenaire"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs">Nom</FormLabel>
                            <FormControl>
                              <Input placeholder="Nom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch('civilitePartenaire') === 'Mme' && (
                        <FormField
                          control={form.control}
                          name="nomJeuneFillePartenaire"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Nom de jeune fille</FormLabel>
                              <FormControl>
                                <Input placeholder="Nom de jeune fille" {...field} />
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
                            <FormLabel className="text-xs">Prénom</FormLabel>
                            <FormControl>
                              <Input placeholder="Prénom" {...field} />
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
                                        } catch (error) {
                                          // Invalid date, keep as string
                                        }
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-10 w-10 shrink-0"
                                    >
                                      <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value instanceof Date ? field.value : undefined}
                                      onSelect={(date) => date && field.onChange(date)}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date('1900-01-01')
                                      }
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

                    {/* Profession (CSP) / Profession (Libellé) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                      <FormField
                        control={form.control}
                        name="professionCSP"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel className="text-xs">Profession (CSP)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger size="lg">
                                    <SelectValue placeholder="Sélectionner une profession" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {professions.map((profession) => (
                                    <SelectItem key={profession} value={profession}>
                                      {profession}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="professionLibelle"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs">Profession (Libellé)</FormLabel>
                            <FormControl>
                              <Input placeholder="Intitulé du poste" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Commune / Pays de naissance / Nationalité */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="lieuNaissancePartenaire"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs">Commune de naissance</FormLabel>
                            <FormControl>
                              <Input placeholder="Commune de naissance" {...field} />
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
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs">Nationalité</FormLabel>
                            <FormControl>
                              <Input placeholder="Nationalité" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Capacité juridique et Personne handicapée sur la même ligne */}
                    <div className="flex items-center gap-6">
                      <FormField
                        control={form.control}
                        name="capaciteJuridique"
                        render={({ field }) => (
                          <FormItem className="w-80">
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel className="text-xs">Capacité juridique</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger size="lg">
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
                          <FormItem className="pt-5">
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
                  </>
                )}
              </div>
            )}

            {/* Section Coordonnées */}
            {activeSection === "coordonnees" && (
              <div className="space-y-5">
            {/* Téléphone / Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="telephonePartenaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro de téléphone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailPartenaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemple.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Adresse */}
            <FormField
              control={form.control}
              name="adressePartenaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse postale</FormLabel>
                  <FormControl>
                    <Input placeholder="Adresse complète" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code postal / Ville / Pays */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="codePostalPartenaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="Code postal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="villePartenaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Ville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paysPartenaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input placeholder="Pays" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
