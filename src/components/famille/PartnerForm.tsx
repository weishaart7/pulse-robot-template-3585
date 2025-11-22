import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  
  civilitePartenaire: z.string().optional(),
  nomPartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  lieuNaissancePartenaire: z.string().optional(),
  professionCSP: z.string().optional(),
  professionLibelle: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
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
      civilitePartenaire: "",
      nomPartenaire: "",
      prenomPartenaire: "",
      lieuNaissancePartenaire: "",
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
        civilitePartenaire: data.civilite_conjoint || "",
        nomPartenaire: data.nom_conjoint || "",
        prenomPartenaire: data.prenom_conjoint || "",
        dateNaissancePartenaire: data.date_naissance_conjoint ? new Date(data.date_naissance_conjoint) : undefined,
        lieuNaissancePartenaire: data.lieu_naissance_conjoint || "",
        professionCSP: data.profession_csp_conjoint || "",
        professionLibelle: data.profession_conjoint || "",
        nationalitePartenaire: data.nationalite_conjoint || "",
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
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire?.toISOString().split('T')[0],
        lieu_naissance_conjoint: formData.lieuNaissancePartenaire,
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
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: <User className="h-4 w-4" /> },
    { id: 'coordonnees' as Section, label: 'Coordonnées', icon: <MapPin className="h-4 w-4" /> },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
        <div className="flex gap-6 min-h-0">
          <Sidebar>
            <SidebarBody>
              <div className="flex flex-col gap-2">
                {sections.map((section) => (
                  <SidebarLink
                    key={section.id}
                    link={section}
                    isActive={activeSection === section.id}
                    onClick={() => setActiveSection(section.id)}
                  />
                ))}
              </div>
            </SidebarBody>
          </Sidebar>

          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-6 pb-6">

            {/* Section Informations générales */}
            {activeSection === "informations-generales" && (
              <div className="space-y-5">
            <FormField
              control={form.control}
              name="statutCouple"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut matrimonial</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {(statutCouple === "Concubinage" ||
              statutCouple === "Pacsé(e)" ||
              statutCouple === "Marié(e)") && (
              <Card>
                <CardHeader>
                  <CardTitle>Informations du conjoint/partenaire</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="civilitePartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Civilité</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M.">M.</SelectItem>
                              <SelectItem value="Mme">Mme</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nomPartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prenomPartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
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
                          <FormLabel>Date de naissance</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Sélectionner une date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lieuNaissancePartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commune de naissance</FormLabel>
                          <FormControl>
                            <Input placeholder="Commune de naissance" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nationalitePartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationalité</FormLabel>
                          <FormControl>
                            <Input placeholder="Nationalité" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionCSP"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profession (CSP)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Catégorie socio-professionnelle"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionLibelle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profession (Libellé)</FormLabel>
                          <FormControl>
                            <Input placeholder="Intitulé du poste" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="personneHandicapee"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Personne handicapée</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
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
        </div>
      </form>
    </Form>
  );
}
