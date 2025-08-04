import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  civilite: z.enum(['M', 'Mme', 'Autre'], {
    required_error: 'Veuillez sélectionner une civilité',
  }),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().min(1, 'Le prénom est obligatoire'),
  dateNaissance: z.date({
    required_error: 'La date de naissance est obligatoire',
  }),
  profession: z.string().optional(),
  professionLibre: z.string().optional(),
  communeNaissance: z.string().min(1, 'La commune de naissance est obligatoire'),
  paysNaissance: z.string().min(1, 'Le pays de naissance est obligatoire'),
  nationalite: z.string().min(1, 'La nationalité est obligatoire'),
  handicape: z.boolean().default(false),
  telephone: z.string().optional(),
  email: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  adresse: z.string().optional(),
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

export function FicheClientForm() {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      handicape: false,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Données du formulaire:', data);
    toast({
      title: 'Fiche client enregistrée',
      description: 'Les informations ont été sauvegardées avec succès.',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Civilité */}
          <FormField
            control={form.control}
            name="civilite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Civilité *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-row space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="m" />
                      <label htmlFor="m">M.</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Mme" id="mme" />
                      <label htmlFor="mme">Mme</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Autre" id="autre" />
                      <label htmlFor="autre">Autre</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nom */}
          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom *</FormLabel>
                <FormControl>
                  <Input placeholder="Nom de famille" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Prénom */}
          <FormField
            control={form.control}
            name="prenom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom *</FormLabel>
                <FormControl>
                  <Input placeholder="Prénom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date de naissance */}
          <FormField
            control={form.control}
            name="dateNaissance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance *</FormLabel>
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
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profession */}
          <FormField
            control={form.control}
            name="profession"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profession</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profession libre */}
          <FormField
            control={form.control}
            name="professionLibre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profession (libellé libre)</FormLabel>
                <FormControl>
                  <Input placeholder="Description libre de la profession" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Commune de naissance */}
          <FormField
            control={form.control}
            name="communeNaissance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commune de naissance *</FormLabel>
                <FormControl>
                  <Input placeholder="Commune de naissance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pays de naissance */}
          <FormField
            control={form.control}
            name="paysNaissance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pays de naissance *</FormLabel>
                <FormControl>
                  <Input placeholder="Pays de naissance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nationalité */}
          <FormField
            control={form.control}
            name="nationalite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nationalité *</FormLabel>
                <FormControl>
                  <Input placeholder="Nationalité" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Téléphone */}
          <FormField
            control={form.control}
            name="telephone"
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

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
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

        {/* Personne handicapée */}
        <FormField
          control={form.control}
          name="handicape"
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

        {/* Adresse postale */}
        <FormField
          control={form.control}
          name="adresse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse postale</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adresse complète"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </Form>
  );
}