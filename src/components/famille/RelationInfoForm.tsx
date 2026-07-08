import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2, Heart, FileText, Gift, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatrimonialRegimeOptions } from "@/components/famille/MatrimonialRegimeOptions";
import { ClausesPersonnaliseesSection } from "@/components/famille/matrimonial/ClausesPersonnaliseesSection";

const formSchema = z.object({
  conventionPacs: z.enum(['Régime de la séparation des biens', 'Indivision']).default('Régime de la séparation des biens'),
  datePacs: z.date().optional(),
  regimeMatrimonial: z.enum([
    'Communauté réduite aux acquêts (option sans contrat de mariage)',
    'Communauté de meubles et d\'acquêts',
    'Communauté universelle',
    'Séparation de biens',
    'Participation aux acquêts'
  ]).default('Communauté réduite aux acquêts (option sans contrat de mariage)'),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
  pasDeContrat: z.boolean().default(false),
  impositionDistincte: z.boolean().default(false),
  donationDernierVivantPersonne: z.boolean().default(false),
  dateDonationPersonne: z.date().optional(),
  donationDernierVivantConjoint: z.boolean().default(false),
  dateDonationConjoint: z.date().optional(),
  mariagePrecedentPersonne: z.boolean().default(false),
  dureeMariagePrecedentPersonneAnnees: z.number().min(0).max(100).optional().nullable(),
  dureeMariagePrecedentPersonneMois: z.number().min(0).max(11).optional().nullable(),
  mariagePrecedentConjoint: z.boolean().default(false),
  dureeMariagePrecedentConjointAnnees: z.number().min(0).max(100).optional().nullable(),
  dureeMariagePrecedentConjointMois: z.number().min(0).max(11).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;
type Section = 'informations-generales' | 'clauses-contrat' | 'donation' | 'historique';

type Props = {
  relationStatus: string;
  onSuccess?: () => void;
};

export function RelationInfoForm({ relationStatus, onSuccess }: Props) {
  const { toast } = useToast();
  const { data: maritalData, saving, saveData } = useMaritalStatus();
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      lieuMariage: "",
      pasDeContrat: false,
      impositionDistincte: false,
      donationDernierVivantPersonne: false,
      donationDernierVivantConjoint: false,
      mariagePrecedentPersonne: false,
      mariagePrecedentConjoint: false,
    },
  });

  useEffect(() => {
    if (maritalData) {
      form.reset({
        conventionPacs: (maritalData.convention_pacs as any) || 'Régime de la séparation des biens',
        datePacs: maritalData.date_pacs ? new Date(maritalData.date_pacs) : undefined,
        regimeMatrimonial: (maritalData.regime_matrimonial as any) || 'Communauté réduite aux acquêts (option sans contrat de mariage)',
        dateMariage: maritalData.date_mariage ? new Date(maritalData.date_mariage) : undefined,
        lieuMariage: maritalData.lieu_mariage || "",
        pasDeContrat: maritalData.pas_de_contrat_mariage || false,
        impositionDistincte: maritalData.imposition_distincte || false,
        donationDernierVivantPersonne: maritalData.donation_dernier_vivant_personne || false,
        dateDonationPersonne: maritalData.date_donation_personne ? new Date(maritalData.date_donation_personne) : undefined,
        donationDernierVivantConjoint: maritalData.donation_dernier_vivant_conjoint || false,
        dateDonationConjoint: maritalData.date_donation_conjoint ? new Date(maritalData.date_donation_conjoint) : undefined,
        mariagePrecedentPersonne: maritalData.mariage_precedent_personne || false,
        dureeMariagePrecedentPersonneAnnees: maritalData.duree_mariage_precedent_personne_annees,
        dureeMariagePrecedentPersonneMois: maritalData.duree_mariage_precedent_personne_mois,
        mariagePrecedentConjoint: maritalData.mariage_precedent_conjoint || false,
        dureeMariagePrecedentConjointAnnees: maritalData.duree_mariage_precedent_conjoint_annees,
        dureeMariagePrecedentConjointMois: maritalData.duree_mariage_precedent_conjoint_mois,
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await saveData({
        convention_pacs: data.conventionPacs,
        date_pacs: data.datePacs?.toISOString().split('T')[0],
        regime_matrimonial: data.regimeMatrimonial,
        date_mariage: data.dateMariage?.toISOString().split('T')[0],
        lieu_mariage: data.lieuMariage,
        pas_de_contrat_mariage: data.pasDeContrat,
        imposition_distincte: data.impositionDistincte,
        donation_dernier_vivant_personne: data.donationDernierVivantPersonne,
        date_donation_personne: data.dateDonationPersonne?.toISOString().split('T')[0],
        donation_dernier_vivant_conjoint: data.donationDernierVivantConjoint,
        date_donation_conjoint: data.dateDonationConjoint?.toISOString().split('T')[0],
        mariage_precedent_personne: data.mariagePrecedentPersonne,
        duree_mariage_precedent_personne_annees: data.dureeMariagePrecedentPersonneAnnees ?? null,
        duree_mariage_precedent_personne_mois: data.dureeMariagePrecedentPersonneMois ?? null,
        mariage_precedent_conjoint: data.mariagePrecedentConjoint,
        duree_mariage_precedent_conjoint_annees: data.dureeMariagePrecedentConjointAnnees ?? null,
        duree_mariage_precedent_conjoint_mois: data.dureeMariagePrecedentConjointMois ?? null,
      });

      toast({ title: "Succès", description: "Les informations ont été enregistrées avec succès." });
      onSuccess?.();
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      toast({ title: "Erreur", description: "Une erreur s'est produite lors de l'enregistrement.", variant: "destructive" });
    }
  };

  const regimeMatrimonial = form.watch("regimeMatrimonial");
  const pasDeContrat = form.watch("pasDeContrat");

  useEffect(() => {
    if (pasDeContrat) {
      form.setValue('regimeMatrimonial', 'Communauté réduite aux acquêts (option sans contrat de mariage)');
    }
  }, [pasDeContrat, form]);

  const sections = relationStatus === "Marié(e)" ? [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: Heart },
    { id: 'clauses-contrat' as Section, label: 'Clauses du contrat', icon: FileText },
    { id: 'donation' as Section, label: 'Donation au dernier vivant', icon: Gift },
    { id: 'historique' as Section, label: 'Historique matrimonial', icon: History },
  ] : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Pills */}
        {sections.length > 0 && (
          <div className="flex gap-2 flex-wrap">
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
        )}

        {/* MARIÉ */}
        {relationStatus === "Marié(e)" && (
          <>
            {activeSection === 'informations-generales' && (
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Date & lieu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="dateMariage"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Date du mariage</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lieuMariage"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Lieu du mariage</FormLabel>
                          <FormControl>
                            <Input placeholder="Lieu du mariage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Régime matrimonial</h3>
                  <FormField
                    control={form.control}
                    name="regimeMatrimonial"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-5">
                        <FormLabel className="text-xs">Régime</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={pasDeContrat}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Communauté réduite aux acquêts (option sans contrat de mariage)">Communauté réduite aux acquêts (option sans contrat de mariage)</SelectItem>
                            <SelectItem value="Communauté de meubles et d'acquêts">Communauté de meubles et d'acquêts</SelectItem>
                            <SelectItem value="Communauté universelle">Communauté universelle</SelectItem>
                            <SelectItem value="Séparation de biens">Séparation de biens</SelectItem>
                            <SelectItem value="Participation aux acquêts">Participation aux acquêts</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-3">
                    <FormField
                      control={form.control}
                      name="pasDeContrat"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">Pas de contrat de mariage</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="impositionDistincte"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">Imposition distincte</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'clauses-contrat' && (
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Clauses du contrat</h3>
                  {pasDeContrat ? (
                    <p className="text-sm text-muted-foreground">Pas de contrat de mariage sélectionné</p>
                  ) : (
                    <MatrimonialRegimeOptions
                      regimeType={
                        regimeMatrimonial === 'Communauté réduite aux acquêts (option sans contrat de mariage)' ? 'communaute_reduite' :
                        regimeMatrimonial === "Communauté de meubles et d'acquêts" ? 'communaute_meubles' :
                        regimeMatrimonial === 'Communauté universelle' ? 'communaute_universelle' :
                        regimeMatrimonial === 'Séparation de biens' ? 'separation_biens' :
                        regimeMatrimonial === 'Participation aux acquêts' ? 'participation_acquets' :
                        'communaute_reduite'
                      }
                    />
                  )}
                </div>

                <ClausesPersonnaliseesSection />
              </div>
            )}

            {activeSection === 'donation' && (
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Donation consentie au conjoint</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <FormField
                      control={form.control}
                      name="donationDernierVivantPersonne"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">J'ai consenti une donation au dernier vivant en faveur de mon conjoint</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch("donationDernierVivantPersonne") && (
                      <FormField
                        control={form.control}
                        name="dateDonationPersonne"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" size="sm" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Date de l'acte</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Donation reçue du conjoint</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <FormField
                      control={form.control}
                      name="donationDernierVivantConjoint"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">J'ai reçu une donation au dernier vivant de la part de mon conjoint</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch("donationDernierVivantConjoint") && (
                      <FormField
                        control={form.control}
                        name="dateDonationConjoint"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" size="sm" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Date de l'acte</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'historique' && (
              <div className="space-y-6">
                {[
                  { title: "Votre mariage précédent", flag: "mariagePrecedentPersonne" as const, annees: "dureeMariagePrecedentPersonneAnnees" as const, mois: "dureeMariagePrecedentPersonneMois" as const, label: "J'ai été marié(e) précédemment" },
                  { title: "Mariage précédent du conjoint", flag: "mariagePrecedentConjoint" as const, annees: "dureeMariagePrecedentConjointAnnees" as const, mois: "dureeMariagePrecedentConjointMois" as const, label: "Mon conjoint a été marié(e) précédemment" },
                ].map((cfg) => (
                  <div key={cfg.flag} className="rounded-md border bg-card p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{cfg.title}</h3>
                    <FormField
                      control={form.control}
                      name={cfg.flag}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">{cfg.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch(cfg.flag) && (
                      <div className="grid grid-cols-2 gap-5 mt-4 max-w-md">
                        <FormField
                          control={form.control}
                          name={cfg.annees}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Durée (années)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="100" placeholder="Ex: 5" value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={cfg.mois}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Durée (mois)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="11" placeholder="Ex: 3" value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PACS */}
        {relationStatus === "Pacsé(e)" && (
          <div className="space-y-6">
            <div className="rounded-md border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Convention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="conventionPacs"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Convention de PACS</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Régime de la séparation des biens">Régime de la séparation des biens</SelectItem>
                          <SelectItem value="Indivision">Indivision</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="datePacs"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Date du PACS</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="impositionDistincte"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-sm">Imposition distincte</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* CONCUBINAGE */}
        {relationStatus === "Concubinage" && (
          <div className="rounded-md border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Concubinage</h3>
            <p className="text-sm text-muted-foreground">
              Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="min-w-[160px]">
            {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>) : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
