import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatrimonialRegimeOptions } from "@/components/famille/MatrimonialRegimeOptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
});

type FormData = z.infer<typeof formSchema>;

type RelationInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationStatus: string;
};

export function RelationInfoDialog({ open, onOpenChange, relationStatus }: RelationInfoDialogProps) {
  const { toast } = useToast();
  const { data: maritalData, saving, saveData } = useMaritalStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      lieuMariage: "",
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
      });
      
      toast({
        title: "Succès",
        description: "Les informations ont été enregistrées avec succès.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'enregistrement.",
        variant: "destructive",
      });
    }
  };

  const getTitle = () => {
    switch (relationStatus) {
      case 'Marié(e)':
        return 'Informations du mariage';
      case 'Pacsé(e)':
        return 'Informations du PACS';
      case 'Concubinage':
        return 'Informations du concubinage';
      default:
        return 'Informations de la relation';
    }
  };

  const regimeMatrimonial = form.watch("regimeMatrimonial");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {relationStatus === "Pacsé(e)" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations du PACS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="conventionPacs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convention de PACS</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger size="lg">
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
                        <FormItem>
                          <FormLabel>Date du PACS</FormLabel>
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
                  </CardContent>
                </Card>
              )}

              {relationStatus === "Marié(e)" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informations du mariage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dateMariage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date du mariage</FormLabel>
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
                          name="lieuMariage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lieu du mariage</FormLabel>
                              <FormControl>
                                <Input placeholder="Lieu du mariage" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="regimeMatrimonial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Régime matrimonial</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger size="lg">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Communauté réduite aux acquêts (option sans contrat de mariage)">
                                  Communauté réduite aux acquêts (option sans contrat de mariage)
                                </SelectItem>
                                <SelectItem value="Communauté de meubles et d'acquêts">
                                  Communauté de meubles et d'acquêts
                                </SelectItem>
                                <SelectItem value="Communauté universelle">
                                  Communauté universelle
                                </SelectItem>
                                <SelectItem value="Séparation de biens">
                                  Séparation de biens
                                </SelectItem>
                                <SelectItem value="Participation aux acquêts">
                                  Participation aux acquêts
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <MatrimonialRegimeOptions
                    regimeType={
                      regimeMatrimonial === 'Communauté réduite aux acquêts (option sans contrat de mariage)' ? 'communaute_reduite' :
                      regimeMatrimonial === 'Communauté de meubles et d\'acquêts' ? 'communaute_meubles' :
                      regimeMatrimonial === 'Communauté universelle' ? 'communaute_universelle' :
                      regimeMatrimonial === 'Séparation de biens' ? 'separation_biens' :
                      regimeMatrimonial === 'Participation aux acquêts' ? 'participation_acquets' :
                      'communaute_reduite'
                    }
                  />
                </div>
              )}

              {relationStatus === "Concubinage" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations du concubinage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
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
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
