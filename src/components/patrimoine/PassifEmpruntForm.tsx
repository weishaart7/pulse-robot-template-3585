import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { EMPRUNT_NATURES, PASSIF_NATURES, TYPE_GARANTIE_OPTIONS } from '@/constants/assetTypes';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Emprunt, Passif } from '@/services/passifService';
import { usePassifEmpruntForm } from '@/hooks/usePassifEmpruntForm';

interface PassifEmpruntFormProps {
  item?: Emprunt | Passif;
  onCancel: () => void;
  onSubmit: () => void;
}

export const PassifEmpruntForm = ({ item, onCancel, onSubmit }: PassifEmpruntFormProps) => {
  const {
    form,
    isLoading,
    detenteurOptions,
    familyData,
    assets,
    originalIsEmprunt,
    handleSubmit,
  } = usePassifEmpruntForm({ item, onSuccess: onSubmit });

  const watchedNature = form.watch('nature');
  const watchedDetenteur = form.watch('detenteur');
  const watchedAssure = form.watch('assure');
  const isEmprunt = EMPRUNT_NATURES.includes(watchedNature);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{item ? 'Modifier' : 'Ajouter'} un passif / emprunt</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="nature" render={({ field }) => (
              <FormItem>
                <FormLabel>Nature</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionnez la nature" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {originalIsEmprunt !== false && (
                      <SelectGroup>
                        <SelectLabel>Emprunts</SelectLabel>
                        {EMPRUNT_NATURES.map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {originalIsEmprunt !== false && originalIsEmprunt !== true && <SelectSeparator />}
                    {originalIsEmprunt !== true && (
                      <SelectGroup>
                        <SelectLabel>Dettes / passifs simples</SelectLabel>
                        {PASSIF_NATURES.map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {isEmprunt && (
              <>
                <FormField control={form.control} name="libelle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl>
                      <Input placeholder="Libellé de l'emprunt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="asset_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actif financé / garanti</FormLabel>
                    <FormDescription>
                      Le détenteur et la quote-part seront préremplis depuis cet actif, puis restent modifiables (emprunt non solidaire).
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger size="lg">
                          <SelectValue placeholder="Aucun actif lié" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id!}>{a.denomination || a.nature}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="capital_restant_du" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capital restant dû (€)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="taux_interet" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux d'intérêt (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="mensualite" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensualité (€)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="duree_restante" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée restante (en mois)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="type_garantie" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de garantie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger size="lg">
                          <SelectValue placeholder="Choisir un type de garantie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_GARANTIE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField
                  control={form.control}
                  name="reporter_budget"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2 cursor-pointer">
                          <Wallet className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          Reporter la mensualité dans le budget
                        </FormLabel>
                        <p className="text-[12px] text-muted-foreground">
                          La mensualité de cet emprunt sera ajoutée automatiquement aux charges du budget mensuel.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Assuré (assurance emprunteur)</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {watchedAssure && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="quotite_assuree_utilisateur" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quotité assurée {familyData.userFirstName || 'vous'} (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" step="0.1" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {watchedDetenteur === 'Le couple' && familyData.hasPartner && (
                      <FormField control={form.control} name="quotite_assuree_conjoint" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quotité assurée {familyData.partnerFirstName || 'conjoint(e)'} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.1" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    <FormField control={form.control} name="capital_garanti_deces" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Capital garanti en cas de décès (€)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </>
            )}

            {watchedNature && !isEmprunt && (
              <FormField control={form.control} name="montant_du" render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant dû (€)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {watchedNature && detenteurOptions.length > 0 && (
              <FormField control={form.control} name="detenteur" render={({ field }) => (
                <FormItem>
                  <FormLabel>Détenteur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Choisir un détenteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {detenteurOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {watchedDetenteur === 'Le couple' && familyData.hasPartner && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="pourcentage_utilisateur" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pourcentage {familyData.userFirstName || 'vous'} (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          form.setValue('pourcentage_conjoint', 100 - value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pourcentage_conjoint" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pourcentage {familyData.partnerFirstName || 'conjoint(e)'} (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          form.setValue('pourcentage_utilisateur', 100 - value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading || !watchedNature}>
                {isLoading ? 'Enregistrement...' : `${item ? 'Modifier' : 'Ajouter'}`}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
