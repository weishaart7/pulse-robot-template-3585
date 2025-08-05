import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  statutCouple: z.enum(['celibataire', 'union_libre', 'pacse', 'marie', 'divorce', 'veuf'], {
    required_error: 'Veuillez sélectionner un statut',
  }),
  parentIsole: z.boolean().default(false),
  personneSeuleEnfant: z.boolean().default(false),
  datePacs: z.date().optional(),
  lieuPacs: z.string().optional(),
  regimePacs: z.enum(['separation', 'indivision']).optional(),
  testamentPacs: z.boolean().default(false),
  regimeMatrimonial: z.string().optional(),
  dateMariage: z.date().optional(),
  donationDernierVivant: z.string().optional(),
  clausePartage: z.string().optional(),
  pourcentagePP: z.number().default(50),
  paysMariage: z.string().optional(),
  mariagesPrecedents: z.boolean().default(false),
  mariagesPrecedentsConjoint: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

const regimesMatrimoniaux = [
  'Communauté réduite aux acquêts',
  'Communauté universelle',
  'Séparation de biens',
  'Participation aux acquêts',
];

export function SituationMatrimonialeForm() {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parentIsole: false,
      personneSeuleEnfant: false,
      testamentPacs: false,
      pourcentagePP: 50,
      mariagesPrecedents: false,
      mariagesPrecedentsConjoint: false,
    },
  });

  const statutCouple = useWatch({
    control: form.control,
    name: 'statutCouple',
  });

  const onSubmit = (data: FormData) => {
    console.log('Situation matrimoniale:', data);
    
    localStorage.setItem('situationMatrimoniale', JSON.stringify(data));
    
    toast({
      title: 'Situation matrimoniale enregistrée',
      description: 'Les informations ont été sauvegardées avec succès.',
    });
  };

  const renderConditionalFields = () => {
    switch (statutCouple) {
      case 'celibataire':
      case 'divorce':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="parentIsole"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Parent isolé</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personneSeuleEnfant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Personne seule ayant élevé ≥ 5 ans un enfant</FormLabel>
                </FormItem>
              )}
            />
          </div>
        );

      case 'pacse':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
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
              name="lieuPacs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu du PACS</FormLabel>
                  <FormControl>
                    <Input placeholder="Lieu du PACS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="regimePacs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Régime</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un régime" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="separation">Séparation</SelectItem>
                      <SelectItem value="indivision">Indivision</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="testamentPacs"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Testament ?</FormLabel>
                </FormItem>
              )}
            />
          </div>
        );

      case 'marie':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="regimeMatrimonial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Régime matrimonial</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un régime" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regimesMatrimoniaux.map((regime) => (
                        <SelectItem key={regime} value={regime}>
                          {regime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateMariage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de mariage</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
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
              name="donationDernierVivant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donation au dernier vivant (époux concerné)</FormLabel>
                  <FormControl>
                    <Input placeholder="Époux concerné" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pourcentagePP"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clause de partage (% PP)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="50"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 'veuf':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="paysMariage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pays du mariage</FormLabel>
                  <FormControl>
                    <Input placeholder="Pays du mariage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parentIsole"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Parent isolé</FormLabel>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="personneSeuleEnfant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Personne seule ayant élevé ≥ 5 ans un enfant</FormLabel>
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Statut de couple */}
        <FormField
          control={form.control}
          name="statutCouple"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut de couple *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="celibataire" id="celibataire" />
                    <label htmlFor="celibataire">Célibataire</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="union_libre" id="union_libre" />
                    <label htmlFor="union_libre">Union libre</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pacse" id="pacse" />
                    <label htmlFor="pacse">Pacsé(e)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="marie" id="marie" />
                    <label htmlFor="marie">Marié(e)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="divorce" id="divorce" />
                    <label htmlFor="divorce">Divorcé(e)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="veuf" id="veuf" />
                    <label htmlFor="veuf">Veuf/Veuve</label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champs conditionnels */}
        {renderConditionalFields()}

        {/* Mariages précédents */}
        <Card>
          <CardHeader>
            <CardTitle>Mariages précédents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="mariagesPrecedents"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Mariage(s) précédent(s) ?</FormLabel>
                </FormItem>
              )}
            />

            {(statutCouple === 'marie' || statutCouple === 'pacse') && (
              <FormField
                control={form.control}
                name="mariagesPrecedentsConjoint"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Mariage(s) précédent(s) du conjoint ?</FormLabel>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </Form>
  );
}