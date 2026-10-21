import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ActifFormFrame } from '@/components/assets/ActifFormFrame';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PASSIF } from '@/lib/palette';
import { NaturePicker, type NatureCategorie } from '@/components/assets/NaturePicker';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMPRUNT_NATURES, EMPRUNT_SOUS_GROUPES, DETTE_SOUS_GROUPES, PASSIF_NATURES, TYPE_GARANTIE_OPTIONS, MODE_AMORTISSEMENT_OPTIONS, TYPE_TAUX_OPTIONS } from '@/constants/assetTypes';
import { format } from 'date-fns';
import { Emprunt, Passif } from '@/services/passifService';
import { usePassifEmpruntForm } from '@/hooks/usePassifEmpruntForm';
import { FieldHelp } from '@/components/ui/field-help';
import { EuroInput } from '@/components/ui/euro-input';
import { DateInput } from '@/components/ui/date-input';
import { SectionHeader } from '@/components/family/SectionHeader';
import { capitalRestantDuAu, construireTableau, contratDepuisEmprunt, echeancesRestantes } from '@/lib/credit/contrat';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface PassifEmpruntFormProps {
  item?: Emprunt | Passif;
  /** Création depuis l'ajout d'un bien : nature et bien relié préremplis. */
  preset?: { nature: string; asset_id: string };
  onCancel: () => void;
  onSubmit: () => void;
  createEmprunt: (data: Omit<Emprunt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Emprunt>;
  updateEmprunt: (id: string, data: Partial<Emprunt>) => Promise<Emprunt>;
  createPassif: (data: Omit<Passif, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Passif>;
  updatePassif: (id: string, data: Partial<Passif>) => Promise<Passif>;
}

type NumberFieldName = 'capital_restant_du' | 'duree_restante' | 'taux_interet' | 'mensualite' | 'montant_du'
  | 'taeg' | 'cout_total_credit' | 'quotite_assuree_utilisateur' | 'quotite_assuree_conjoint' | 'capital_garanti_deces'
  | 'capital_initial' | 'duree_totale_mois' | 'differe_mois' | 'assurance_valeur' | 'frais_dossier' | 'frais_garantie';

// Champ numérique saisi comme texte : accepte la virgule comme le point et peut rester vide. Le texte
// tapé est conservé tel quel (« 3, » en cours de saisie) ; le formulaire reçoit un nombre, ou null
// quand le champ est vide (undefined ferait revenir react-hook-form à la valeur par défaut).
type ChampNombreProps = Omit<React.ComponentProps<typeof EuroInput>, 'value' | 'onChange'> & {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  integer?: boolean;
};

const ChampNombre = React.forwardRef<HTMLInputElement, ChampNombreProps>(({ value, onChange, integer, ...props }, ref) => {
  const [texte, setTexte] = React.useState(value == null ? '' : String(value).replace('.', ','));
  // Valeur changée de l'extérieur (réinitialisation, valeur calculée) : on resynchronise le texte.
  React.useEffect(() => {
    const courant = texte.trim() === '' ? null : Number(texte.replace(',', '.'));
    if ((value ?? null) !== courant) setTexte(value == null ? '' : String(value).replace('.', ','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <EuroInput
      ref={ref}
      {...props}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={texte}
      onChange={(e) => {
        const brut = e.target.value.replace(/\s/g, '');
        if (!(integer ? /^\d*$/ : /^\d*[.,]?\d*$/).test(brut)) return;
        setTexte(brut);
        const n = Number(brut.replace(',', '.'));
        onChange(brut === '' || brut === ',' || brut === '.' ? null : n);
      }}
    />
  );
});
ChampNombre.displayName = 'ChampNombre';

// Valeur calculée affichée à la place d'un champ (contrat complet).
const CalculatedValue = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-2">
    <p className="text-[13px] font-medium leading-none text-foreground">{label}</p>
    <div className="flex h-9 items-center justify-between border-l-2 border-lagon bg-lagon-soft/60 px-3 text-sm tabular-nums">
      {value}
      <span className="text-[11.5px] text-lagon-ink">calculé</span>
    </div>
  </div>
);

// Section titrée du formulaire, champs sur deux colonnes (comme les panneaux de travail).
const FormSection = ({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) => (
  <section className="py-6 first:pt-0">
    <SectionHeader title={title} />
    {intro && <p className="-mt-2 mb-4 max-w-2xl text-[12.5px] text-muted-foreground">{intro}</p>}
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">{children}</div>
  </section>
);

export const PassifEmpruntForm = ({
  item,
  preset,
  onCancel,
  onSubmit,
  createEmprunt,
  updateEmprunt,
  createPassif,
  updatePassif,
}: PassifEmpruntFormProps) => {
  const {
    form,
    isLoading,
    detenteurOptions,
    familyData,
    assets,
    originalIsEmprunt,
    handleSubmit,
  } = usePassifEmpruntForm({ item, preset, onSuccess: onSubmit, createEmprunt, updateEmprunt, createPassif, updatePassif });

  const watchedNature = form.watch('nature');
  const watchedDetenteur = form.watch('detenteur');
  const watchedAssure = form.watch('assure');
  const watchedQualificationBien = form.watch('qualification_bien');
  const isEmprunt = EMPRUNT_NATURES.includes(watchedNature);
  // Un emprunt existant ne devient pas une dette simple (et inversement) : tables distinctes.
  const categoriesPassif = useMemo<NatureCategorie[]>(() => [
    ...(originalIsEmprunt !== false ? [{ cle: 'emprunts', libelle: 'Emprunts', couleur: PASSIF.emprunt, sousGroupes: EMPRUNT_SOUS_GROUPES }] : []),
    ...(originalIsEmprunt !== true ? [{ cle: 'dettes', libelle: 'Dettes et passifs simples', couleur: PASSIF.dette, sousGroupes: DETTE_SOUS_GROUPES }] : []),
  ], [originalIsEmprunt]);
  const watchedDiffere = form.watch('differe_mois');
  const watchedAssuranceMode = form.watch('assurance_mode');
  // Contrat complet : capital restant dû et durée restante calculés (aperçu à la date du jour).
  const contratValues = form.watch(['capital_initial', 'date_premiere_echeance', 'duree_totale_mois', 'taux_interet', 'mode_amortissement', 'differe_mois', 'differe_type']);
  const apercu = (() => {
    const [capital_initial, date_premiere_echeance, duree_totale_mois, taux_interet, mode_amortissement, differe_mois, differe_type] = contratValues;
    const contrat = contratDepuisEmprunt({ capital_initial, date_premiere_echeance, duree_totale_mois, taux_interet, mode_amortissement, differe_mois, differe_type, assurance_mode: null, assurance_valeur: null, frais_dossier: null, frais_garantie: null });
    if (!contrat) return null;
    const tableau = construireTableau(contrat);
    return {
      crd: capitalRestantDuAu(tableau, contrat.capitalInitial, new Date()),
      dureeRestante: echeancesRestantes(tableau, new Date()),
      mensualite: tableau.mensualiteHorsAssurance,
    };
  })();
  // "Le couple" (commun, 50/50 fixé par la loi) n'a de sens que si la dette
  // n'est pas qualifiée "Bien propre"/"Bien personnel" (100/0 binaire) — même
  // garde-fou que AssetForm.tsx.
  const filteredDetenteurOptions = watchedQualificationBien === 'Bien propre' || watchedQualificationBien === 'Bien personnel'
    ? detenteurOptions.filter(option => option !== 'Le couple')
    : detenteurOptions;

  // Champ numérique avec unité dans le champ (€ par défaut).
  const numberField = (
    name: NumberFieldName,
    label: string,
    opts: { suffix?: string; step?: string; integer?: boolean; help?: string } = {},
  ) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        {opts.help && <FieldHelp>{opts.help}</FieldHelp>}
        <FormControl>
          <ChampNombre suffix={opts.suffix} integer={opts.integer} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <ActifFormFrame
      section="Passifs"
      title={`${item ? 'Modifier' : 'Ajouter'} un passif / emprunt`}
      trail={item ? 'Modifier' : 'Ajouter'}
      actions={
        <>
          <Button type="button" variant="outline" onClick={onCancel} className={panelButtonClass}>
            Annuler
          </Button>
          <Button type="submit" form="passif-form" disabled={isLoading || !watchedNature} className={panelPrimaryButtonClass}>
            {isLoading ? <><LogoSpinner />Enregistrement...</> : (item ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </>
      }
    >
        <Form {...form}>
          <form id="passif-form" onSubmit={form.handleSubmit(handleSubmit)} className="max-w-4xl divide-y divide-border">
            <FormSection title="Type de passif">
              <FormField control={form.control} name="nature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nature</FormLabel>
                  <FormControl>
                    <NaturePicker
                      value={field.value}
                      onChange={field.onChange}
                      categories={categoriesPassif}
                      titre="Nature du passif"
                      placeholderRecherche="Prêt immobilier, crédit relais, impôt…"
                      placeholder="Sélectionnez la nature"
                      className="h-10 bg-background border-border shadow-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {isEmprunt && (
                <FormField control={form.control} name="libelle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Prêt résidence principale — Crédit Agricole" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </FormSection>

            {watchedNature && (
              <FormSection title={isEmprunt ? 'Le prêt' : 'La dette'}>
                {isEmprunt && (
                  <FormField control={form.control} name="asset_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actif financé / garanti</FormLabel>
                      <FieldHelp>
                        Le détenteur et la quote-part seront préremplis depuis cet actif, puis restent modifiables (emprunt non solidaire).
                      </FieldHelp>
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
                )}

                <FormField control={form.control} name="date_souscription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de souscription</FormLabel>
                    <FieldHelp>
                      Date à laquelle la dette a été contractée. Une dette antérieure au mariage ou au PACS reste personnelle à celui qui l'a contractée. Sans date, elle est présumée contractée pendant l'union.
                    </FieldHelp>
                    <FormControl>
                      <DateInput
                        value={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
                        onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {isEmprunt ? (
                  <>
                    {apercu
                      ? <CalculatedValue label="Capital restant dû" value={formatCurrency(apercu.crd)} />
                      : numberField('capital_restant_du', 'Capital restant dû', { help: "Renseignez l'offre de prêt ci-dessous pour qu'il soit calculé automatiquement." })}
                    {apercu
                      ? <CalculatedValue label="Durée restante" value={`${apercu.dureeRestante} mois`} />
                      : numberField('duree_restante', 'Durée restante', { suffix: 'mois', integer: true })}
                    {numberField('taux_interet', "Taux d'intérêt", { suffix: '%', step: '0.01', help: 'Taux nominal. Un taux variable est projeté au taux actuel, supposé constant.' })}
                    {/* Contrat complet : mensualité du tableau d'amortissement (capital + intérêts), non modifiable. */}
                    {apercu
                      ? <CalculatedValue label="Mensualité hors assurance" value={formatCurrency(apercu.mensualite)} />
                      : numberField('mensualite', 'Mensualité', { help: 'Hors assurance emprunteur, intérêts compris.' })}
                  </>
                ) : (
                  numberField('montant_du', 'Montant dû')
                )}
              </FormSection>
            )}

            {isEmprunt && (
              <FormSection title="Offre de prêt" intro="Facultatif : avec le capital emprunté, la première échéance et la durée totale, le tableau d'amortissement est calculé et le capital restant dû se met à jour chaque mois.">
                {numberField('capital_initial', 'Capital emprunté')}
                <FormField control={form.control} name="date_premiere_echeance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de première échéance</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
                        onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {numberField('duree_totale_mois', 'Durée totale', { suffix: 'mois', integer: true, help: 'Nombre total d\'échéances, différé compris (ex. 240 pour 20 ans).' })}
                {numberField('differe_mois', 'Différé', { suffix: 'mois', integer: true, help: 'Période en début de prêt pendant laquelle le capital n\'est pas remboursé (0 si aucun).' })}
                {!!watchedDiffere && watchedDiffere > 0 && (
                  <FormField control={form.control} name="differe_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de différé</FormLabel>
                      <FieldHelp>Partiel : seuls les intérêts sont payés. Total : rien n'est payé, les intérêts s'ajoutent au capital.</FieldHelp>
                      <Select onValueChange={field.onChange} value={field.value || 'partiel'}>
                        <FormControl>
                          <SelectTrigger size="lg"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="partiel">Partiel (intérêts payés)</SelectItem>
                          <SelectItem value="total">Total (intérêts capitalisés)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {numberField('frais_dossier', 'Frais de dossier')}
                {numberField('frais_garantie', 'Frais de garantie', { help: 'Caution, hypothèque ou nantissement.' })}
              </FormSection>
            )}

            {isEmprunt && (
              <FormSection title="Conditions de l'offre">
                <FormField control={form.control} name="mode_amortissement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode d'amortissement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger size="lg">
                          <SelectValue placeholder="Choisir un mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODE_AMORTISSEMENT_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="type_taux" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de taux</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger size="lg">
                          <SelectValue placeholder="Choisir un type de taux" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_TAUX_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {numberField('taeg', 'TAEG', { suffix: '%', step: '0.01', help: "Tel que figurant sur l'offre de prêt." })}
                {numberField('cout_total_credit', 'Coût total du crédit', { help: "Tel que figurant sur l'offre de prêt." })}
              </FormSection>
            )}

            {isEmprunt && (
              <FormSection title="Garantie et assurance">
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

                <FormField control={form.control} name="assure" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 md:pt-7">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Assuré (assurance emprunteur)</FormLabel>
                  </FormItem>
                )} />

                {watchedAssure && (
                  <>
                    <FormField control={form.control} name="assurance_mode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coût de l'assurance</FormLabel>
                        <FieldHelp>Sert au tableau d'amortissement. Taux sur le capital initial : cas le plus courant en contrat groupe bancaire. Taux sur le capital restant dû : fréquent en délégation.</FieldHelp>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg"><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="taux_capital_initial">Taux annuel sur le capital initial</SelectItem>
                            <SelectItem value="taux_crd">Taux annuel sur le capital restant dû</SelectItem>
                            <SelectItem value="montant">Montant mensuel fixe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {watchedAssuranceMode
                      ? numberField('assurance_valeur', watchedAssuranceMode === 'montant' ? 'Montant mensuel' : 'Taux annuel', watchedAssuranceMode === 'montant' ? {} : { suffix: '%', step: '0.01' })
                      : <div className="hidden md:block" />}
                    {numberField('quotite_assuree_utilisateur', `Quotité assurée ${familyData.userFirstName || 'vous'}`, { suffix: '%', step: '0.1' })}
                    {watchedDetenteur === 'Le couple' && familyData.hasPartner
                      ? numberField('quotite_assuree_conjoint', `Quotité assurée ${familyData.partnerFirstName || 'conjoint(e)'}`, { suffix: '%', step: '0.1' })
                      : <div className="hidden md:block" />}
                    {numberField('capital_garanti_deces', 'Capital garanti en cas de décès')}
                  </>
                )}
              </FormSection>
            )}

            {watchedNature && (
              <FormSection title="Détention">
                {detenteurOptions.length > 0 && (
                  <FormField control={form.control} name="detenteur" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Détenteur</FormLabel>
                      {(watchedQualificationBien === 'Bien propre' || watchedQualificationBien === 'Bien personnel') && (
                        <FieldHelp>
                          "Le couple" n'est pas proposé : cette dette est qualifiée {watchedQualificationBien.toLowerCase()}, elle appartient donc entièrement à une seule personne.
                        </FieldHelp>
                      )}
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg">
                            <SelectValue placeholder="Choisir un détenteur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredDetenteurOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {watchedDetenteur === 'Le couple' && familyData.hasPartner && (
                        <p className="text-[12px] text-muted-foreground">
                          Réparti 50 % / 50 % entre {familyData.userFirstName || 'vous'} et {familyData.partnerFirstName || 'votre conjoint(e)'}
                          <FieldHelp>Bien commun : répartition fixée par la loi, non modifiable.</FieldHelp>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {isEmprunt && (
                  <FormField control={form.control} name="contributeur_remboursement" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contributeur au remboursement</FormLabel>
                      <FieldHelp>
                        Qui règle effectivement les mensualités, indépendamment de la titularité juridique de la dette ci-dessus.
                      </FieldHelp>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg">
                            <SelectValue placeholder="Qui règle les mensualités ?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="utilisateur">{familyData.userFirstName || 'Vous'}</SelectItem>
                          <SelectItem value="conjoint">{familyData.partnerFirstName || 'Conjoint(e)'}</SelectItem>
                          <SelectItem value="les_deux">Les deux</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {isEmprunt && (
                  <FormField control={form.control} name="reporter_budget" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 md:col-span-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="flex cursor-pointer items-center leading-none">
                        Reporter la mensualité dans le budget
                        <FieldHelp>La mensualité de cet emprunt sera ajoutée automatiquement aux charges du budget mensuel.</FieldHelp>
                      </FormLabel>
                    </FormItem>
                  )} />
                )}
              </FormSection>
            )}
          </form>
        </Form>
    </ActifFormFrame>
  );
};
