import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RevenusDistribuesInput } from '@/components/immobilier/parts/RevenusDistribuesInput';
import { AssetFormValues, SITUATION_PARTICULIERE_OPTIONS } from '@/schemas/assetSchema';
import {
  getAssetCategory,
  NATURES_PER,
  NATURE_PER_TOUJOURS_ASSURANTIEL,
  NATURES_RETRAITE_RENTE_EXONERATION_990I_PAR_DEFAUT,
  isRetraiteRente,
  NATURE_ARTICLE_82,
  NATURES_787C,
  NATURES_PLANCHER_ASSURANCE,
  isAssuranceVieHorsSuccession,
  NATURE_RETRAITE_ETRANGERE,
  CTO_SOUS_JACENT_OPTIONS,
  PARTS_FONCIERES_NATURES,
  REGIME_FISCAL_PARTS_OPTIONS,
  CORPS_NATURES_CHAMPS,
  RETRAITE_PREVOYANCE_NATURES_CHAMPS,
  MODE_SORTIE_OPTIONS,
  NATURES_EPARGNE_SALARIALE,
  MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS,
  LIQUIDITES_NATURES_CHAMPS,
  VALEURS_MOBILIERES_NATURES_CHAMPS,
  QUALIFICATIONS_NFT,
  isEpargneAssuranceVie,
  isPrevoyanceDeces,
  isCreance,
  isNatureRurale,
  REGIME_RURAL_IMPOSE,
  TYPES_GROUPEMENT_FONCIER,
  NATURE_GROUPEMENT_FONCIER,
  NATURE_SEF,
} from '@/constants/assetTypes';
import { NATURES_LIQUIDITES_FR } from '@/schemas/assetSchema';
import { NATURES_WITH_ETABLISSEMENT } from '@/hooks/useAssetForm';
import { isPartsSocieteNature } from '@/lib/patrimoine/societeTransfer';
import { useSocietes } from '@/hooks/useSocietes';

// Valeur du choix « Aucune » de la liste Société liée (une SelectItem ne peut pas valoir '').
const AUCUNE_SOCIETE = 'aucune';
import { FieldHelp } from '@/components/ui/field-help';

interface CaracteristiquesFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

// Reprend à l'identique l'onglet "Caractéristiques" de AssetForm.tsx : tous
// les champs conditionnés à la nature de l'actif (établissement, PER,
// montres, vins, produits structurés, SCPI, etc.). Réutilisable telle quelle
// à la fois par l'onglet de modification et par l'étape "Particularités" du
// wizard de création.
export const CaracteristiquesFields: React.FC<CaracteristiquesFieldsProps> = ({ form }) => {
  const watchedNature = form.watch('nature');
  const isImmobilier = getAssetCategory(watchedNature) === 'actifs immobiliers';
  const isPartsSociete = isPartsSocieteNature(watchedNature);
  const { societes } = useSocietes();
  const isEpargneAV = isEpargneAssuranceVie(watchedNature);
  const showEtablissement = NATURES_WITH_ETABLISSEMENT.includes(watchedNature);
  const showBienEtranger = watchedNature && !NATURES_LIQUIDITES_FR.includes(watchedNature);
  const isPER = NATURES_PER.includes(watchedNature);
  const isPERObligatoire = watchedNature === NATURE_PER_TOUJOURS_ASSURANTIEL;
  const isCTO = watchedNature === 'Compte-titres (CTO)';
  const isPartsFoncieres = (PARTS_FONCIERES_NATURES as readonly string[]).includes(watchedNature);
  const etablissementLabel = watchedNature === 'Parts de SCPI'
    ? 'Société de gestion'
    : isPartsFoncieres
      ? 'Gestionnaire'
      : 'Établissement';
  const regimeFiscalPartsOptions = REGIME_FISCAL_PARTS_OPTIONS[watchedNature] || [];
  const corpsChamps = CORPS_NATURES_CHAMPS[watchedNature] || [];
  const showCertificatExpertise = corpsChamps.includes('certificat_expertise');
  const showNumeroSerie = corpsChamps.includes('numero_serie');
  const showQuantiteMillesime = corpsChamps.includes('quantite_millesime');
  const watchedCertificatExpertise = form.watch('certificat_expertise');
  const retraitePrevoyanceChamps = RETRAITE_PREVOYANCE_NATURES_CHAMPS[watchedNature] || [];
  const showModeSortie = retraitePrevoyanceChamps.includes('mode_sortie');
  const watchedSousTypePer = form.watch('sous_type_per');
  // Le champ texte libre "Bénéficiaire désigné" n'est plus proposé : la clause d'un PER
  // assurantiel ou d'un article 82 se saisit dans Transmission →
  // Assurance-vie (clause structurée, seule lue par le calcul de transmission).
  const showRenvoiClauseArticle82 = watchedNature === NATURE_ARTICLE_82;
  const showRenvoiClausePER = isPERObligatoire || (isPER && watchedSousTypePer === 'Assurantiel');

  const isRetraiteRenteNature = isRetraiteRente(watchedNature);
  const watchedGarantieDeces = form.watch('garantie_deces');
  // Madelin / article 83 : conditions d'exclusion du 990 I remplies par
  // construction — proposées par défaut, modifiables.
  useEffect(() => {
    if (
      watchedGarantieDeces === true
      && NATURES_RETRAITE_RENTE_EXONERATION_990I_PAR_DEFAUT.includes(watchedNature)
      && form.getValues('conditions_exoneration_990i') === undefined
    ) {
      form.setValue('conditions_exoneration_990i', true);
    }
  }, [watchedGarantieDeces, watchedNature, form]);

  // Biens ruraux, groupements fonciers, bois et forêts : régime d'exonération
  // imposé (« Bois & forêts ») ou proposé par défaut (GFA), modifiable.
  const isRurale = isNatureRurale(watchedNature);
  const isBien787C = NATURES_787C.includes(watchedNature);
  const isPlancherAssurance = NATURES_PLANCHER_ASSURANCE.includes(watchedNature);
  const isAssuranceVie = isAssuranceVieHorsSuccession(watchedNature);
  const regimeRuralImpose = REGIME_RURAL_IMPOSE[watchedNature];
  const watchedRegimeRural = form.watch('regime_exoneration_rural');
  const watchedConditionsRural = form.watch('conditions_exoneration_rural');
  const isTerrain = watchedNature === 'Terrains';
  const isBois = watchedNature === 'Bois & forêts';
  const isMaisonMobile = watchedNature === 'Maison mobile (péniche, etc.)';
  const isLMNP = watchedNature === 'Immeubles locatifs (LMNP)';
  const isDroitsSociaux = watchedNature === 'Droits sociaux' || watchedNature === 'Parts de holding';
  const isNft = watchedNature === 'Objets numériques (NFT, etc.)';
  const isMatieresPremieres = watchedNature === 'Matières premières (pétrole, blé…)';
  const watchedDetentionMP = form.watch('detention_matieres_premieres');
  useEffect(() => {
    if (regimeRuralImpose && form.getValues('regime_exoneration_rural') !== regimeRuralImpose) {
      form.setValue('regime_exoneration_rural', regimeRuralImpose);
    }
  }, [regimeRuralImpose, watchedNature, form]);

  // Groupement foncier : le type choisi propose son régime d'exonération (modifiable ensuite).
  const isGroupementFoncier = watchedNature === NATURE_GROUPEMENT_FONCIER;
  const changerTypeGroupement = (type: string) => {
    form.setValue('type_groupement', type as AssetFormValues['type_groupement'], { shouldDirty: true });
    const regime = TYPES_GROUPEMENT_FONCIER.find((t) => t.value === type)?.regime;
    if (regime) form.setValue('regime_exoneration_rural', regime, { shouldDirty: true });
  };

  // PER obligatoire : sous-type figé sur Assurantiel, enregistré tel quel.
  useEffect(() => {
    if (isPERObligatoire && form.getValues('sous_type_per') !== 'Assurantiel') {
      form.setValue('sous_type_per', 'Assurantiel');
    }
  }, [isPERObligatoire, form]);
  const isEpargneSalariale = (NATURES_EPARGNE_SALARIALE as readonly string[]).includes(watchedNature);
  const liquiditesChamps = LIQUIDITES_NATURES_CHAMPS[watchedNature] || [];
  const showTauxRemuneration = liquiditesChamps.includes('taux_remuneration');
  const showDateEcheanceLiquidites = liquiditesChamps.includes('date_echeance');
  const valeursMobilieresChamps = VALEURS_MOBILIERES_NATURES_CHAMPS[watchedNature] || [];
  const showPlafondVerse = valeursMobilieresChamps.includes('plafond_verse');
  const showDureeBlocage = valeursMobilieresChamps.includes('duree_blocage');
  const showReductionIrEntree = valeursMobilieresChamps.includes('reduction_ir_entree');
  const showDateAttribution = valeursMobilieresChamps.includes('date_attribution');
  const showPrixExercice = valeursMobilieresChamps.includes('prix_exercice');
  const showMontantEngageAppele = valeursMobilieresChamps.includes('montant_engage');
  const showSousJacent = valeursMobilieresChamps.includes('sous_jacent');
  const showDateEcheanceVM = valeursMobilieresChamps.includes('date_echeance');
  const showCapitalGarantiVM = valeursMobilieresChamps.includes('capital_garanti');
  // Matières premières : stockage et quantité n'ont de sens qu'en détention physique.
  const showLieuStockageQuantite = valeursMobilieresChamps.includes('lieu_stockage')
    && (!isMatieresPremieres || watchedDetentionMP === 'physique');
  const watchedCtoMultiActifs = form.watch('cto_multi_actifs');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showEtablissement && (
          <FormField control={form.control} name="etablissement" render={({ field }) => (
            <FormItem>
              <FormLabel>{etablissementLabel}</FormLabel>
              <FormControl>
                <Input className="bg-background border-border shadow-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {isPartsFoncieres && (
          <FormField control={form.control} name="revenus_distribues_12m" render={({ field }) => (
            <FormItem>
              <FormLabel>Revenus distribués (12 derniers mois)</FormLabel>
              <RevenusDistribuesInput
                value={field.value ?? undefined}
                onChange={field.onChange}
                valeurEstimee={form.watch('valeur_estimee')}
              />
              <FormMessage />
            </FormItem>
          )} />
        )}

        {isPartsFoncieres && (
          <FormField control={form.control} name="regime_fiscal_parts" render={({ field }) => (
            <FormItem>
              <FormLabel>Régime fiscal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir le régime fiscal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {regimeFiscalPartsOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {!isCreance(watchedNature) && !isPrevoyanceDeces(watchedNature) && <FormField control={form.control} name="situation_particuliere" render={({ field }) => (
          <FormItem>
            <FormLabel>Situation particulière</FormLabel>
            <Select
              onValueChange={(value) => field.onChange([value])}
              value={field.value?.[0] || 'Non'}
            >
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                  <SelectValue placeholder="Choisir la situation particulière" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SITUATION_PARTICULIERE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />}

        {showNumeroSerie && (
          <FormField control={form.control} name="numero_serie" render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de série</FormLabel>
              <FormControl>
                <Input className="bg-background border-border shadow-none" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {showQuantiteMillesime && (
          <FormField control={form.control} name="quantite_millesime" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantité / Millésime</FormLabel>
              <FormControl>
                <Input className="bg-background border-border shadow-none" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      {showCertificatExpertise && (
        <FormField
          control={form.control}
          name="certificat_expertise"
          render={({ field }) => (
            <FormItem className="rounded-[2px] border border-border p-4 space-y-3">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Certificat d'authenticité ou expertise</FormLabel>
                </div>
              </div>

              {watchedCertificatExpertise && (
                <FormField control={form.control} name="certificat_expertise_reference" render={({ field: refField }) => (
                  <FormItem className="pl-7">
                    <FormLabel>Référence</FormLabel>
                    <FormControl>
                      <Input className="bg-background border-border shadow-none" {...refField} value={refField.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </FormItem>
          )}
        />
      )}

      {showBienEtranger && !isPrevoyanceDeces(watchedNature) && (
        <FormField
          control={form.control}
          name="bien_etranger"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="flex items-center leading-none">
                <FormLabel className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Bien situé à l'étranger
                </FormLabel>
                <FieldHelp>
                  Impact fiscal : déclaration spécifique (formulaire 3916 pour les comptes, conventions fiscales, IFI sur immobilier étranger). À traiter au cas par cas.
                </FieldHelp>
              </div>
            </FormItem>
          )}
        />
      )}

      {/*
        Le transfert vers "Immobilier" est automatique pour toute nature de la famille "actifs
        immobiliers" (cf. handleSubmit dans useAssetForm.ts) et ne se pilote donc plus par case à
        cocher — sauf pour "Parts de SCI", seule nature immobilière qui soit aussi des parts de
        société : le choix reste manuel.
      */}
      {isImmobilier && isPartsSociete && (
        <FormField
          control={form.control}
          name="transfert_immobilier"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="flex items-center leading-none">
                <FormLabel>Transfert dans Immobilier</FormLabel>
                <FieldHelp>Ce bien apparaîtra dans la section "Immobilier" → "Mes biens"</FieldHelp>
              </div>
            </FormItem>
          )}
        />
      )}

      {/* Rattachement des titres à leur fiche société (assets.societe_id, cf. societeTransfer.ts). */}
      {isPartsSociete && (
        <FormField
          control={form.control}
          name="societe_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Société liée</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === AUCUNE_SOCIETE ? null : value)}
                value={field.value || AUCUNE_SOCIETE}
              >
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir la société" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={AUCUNE_SOCIETE}>Aucune</SelectItem>
                  {societes.map((societe) => (
                    <SelectItem key={societe.id} value={societe.id}>{societe.denomination}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHelp>
                {societes.length === 0
                  ? 'Aucune société enregistrée : créez-la d\'abord dans "Sociétés" → "Mes sociétés".'
                  : 'Société dont cet actif représente les titres. Elle fait autorité sur la qualification, le détenteur et les quotités'
                    + ' (reportés sur l\'actif à chaque enregistrement de la société), porte le pacte Dutreil'
                    + (watchedNature === 'Parts de SCI' ? ' et le régime IR / IS qui détermine la plus-value des parts.' : '.')}
              </FieldHelp>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isPER && (
        <FormField control={form.control} name="sous_type_per" render={({ field }) => (
          <FormItem>
            <FormLabel>Sous-type</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={isPERObligatoire ? 'Assurantiel' : field.value}
              disabled={isPERObligatoire}
            >
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                  <SelectValue placeholder="Choisir un sous-type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Bancaire">Bancaire</SelectItem>
                <SelectItem value="Assurantiel">Assurantiel</SelectItem>
              </SelectContent>
            </Select>
            <FieldHelp>
              {isPERObligatoire
                ? "Un PER obligatoire est toujours souscrit via un contrat d'assurance de groupe : il est assurantiel."
                : "Assurantiel : contrat d'assurance de groupe géré par un assureur, avec une clause bénéficiaire — capital transmis hors succession. Bancaire : compte-titres ouvert auprès d'une banque ou d'une société de gestion, sans clause bénéficiaire — l'épargne entre dans la succession."}
            </FieldHelp>
            <FormMessage />
            {showRenvoiClausePER && (
              <FieldHelp>
                La clause bénéficiaire de ce PER se renseigne dans Transmission → Assurance-vie.
              </FieldHelp>
            )}
          </FormItem>
        )} />
      )}

      {isRetraiteRenteNature && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="garantie_deces" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Garantie décès
                <FieldHelp>
                  Contre-assurance ou réversion prévue en cas de décès avant la retraite. Sans elle, l'épargne
                  reste acquise à l'assureur : rien n'est transmis ni n'entre dans la succession. Avec elle,
                  une rente ou un capital est versé hors succession aux bénéficiaires de la clause (à saisir
                  dans Transmission → Assurance-vie).
                </FieldHelp>
              </FormLabel>
              <Select
                onValueChange={val => field.onChange(val === 'oui')}
                value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
              >
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {watchedGarantieDeces === true && (
            <FormField control={form.control} name="conditions_exoneration_990i" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Exonération du prélèvement 990 I
                  <FieldHelp>
                    Primes versées régulièrement pendant au moins 15 ans et sortie au plus tôt à la liquidation
                    de la retraite (art. 990 I al. 2 CGI) : le capital transmis échappe au prélèvement 990 I.
                    Les primes versées après 70 ans restent soumises au 757 B.
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Conditions remplies</SelectItem>
                    <SelectItem value="non">Conditions non remplies</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {watchedNature === NATURE_RETRAITE_ETRANGERE && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="regime_retraite_etrangere" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Transmission au décès
                <FieldHelp>
                  Selon le droit du régime : épargne individuelle transmise par la succession, capital versé aux
                  bénéficiaires désignés (traité comme une assurance-vie, art. 990 I / 757 B — à vérifier selon la
                  convention fiscale), ou rente viagère éteinte au décès sans rien transmettre.
                </FieldHelp>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="actif_successoral">Épargne transmise par la succession</SelectItem>
                  <SelectItem value="clause_beneficiaire">Capital versé à des bénéficiaires désignés</SelectItem>
                  <SelectItem value="aucune">Rien n'est transmis (rente éteinte)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {isBien787C && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="conditions_787c" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Exonération des biens professionnels (art. 787 C)
                <FieldHelp>
                  Biens affectés à l'exploitation d'une entreprise individuelle, exonérés de droits de succession à 75 % si :
                  biens détenus depuis au moins 2 ans (s'ils ont été acquis à titre onéreux), engagement des héritiers de
                  les conserver 4 ans, et poursuite de l'exploitation par l'un d'eux pendant 3 ans.
                </FieldHelp>
              </FormLabel>
              <Select
                onValueChange={val => field.onChange(val === 'oui')}
                value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
              >
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="oui">Conditions remplies</SelectItem>
                  <SelectItem value="non">Conditions non remplies</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {isPlancherAssurance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="valeur_assuree" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Valeur assurée
                <FieldHelp>
                  Évaluation figurant dans le contrat d'assurance vol ou incendie en cours, conclu depuis moins de 10 ans.
                  Pour les droits de succession, la valeur retenue ne peut être inférieure à 60 % de ce montant
                  (art. 764 II CGI), sauf preuve contraire. Laisser vide sans contrat.
                </FieldHelp>
              </FormLabel>
              <FormControl>
                <EuroInput
                  className="bg-background border-border shadow-none"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {isAssuranceVie && (
        <FormField control={form.control} name="assure_tiers" render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={!!field.value} onCheckedChange={v => field.onChange(v === true)} />
            </FormControl>
            <FormLabel className="font-normal">
              L'assuré n'est pas le souscripteur
              <FieldHelp>
                Contrat souscrit sur la tête d'une autre personne : il n'est pas dénoué au décès du souscripteur, sa valeur
                de rachat entre alors dans la succession du souscripteur. Le capital n'est versé qu'au décès de l'assuré.
              </FieldHelp>
            </FormLabel>
          </FormItem>
        )} />
      )}

      {isRurale && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isGroupementFoncier && (
            <FormField control={form.control} name="type_groupement" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  Type de groupement
                  <FieldHelp>
                    Informatif. Le type choisi propose le régime d'exonération correspondant, que vous pouvez ensuite modifier.
                  </FieldHelp>
                </FormLabel>
                <Select onValueChange={changerTypeGroupement} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPES_GROUPEMENT_FONCIER.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          <FormField control={form.control} name="regime_exoneration_rural" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Exonération de droits de succession
                <FieldHelp>
                  Forestier : bois, forêts et groupements forestiers, exonérés aux 3/4 sans plafond (art. 793 CGI).
                  Agricole : GFA, GAF, GFV et terres louées par bail rural à long terme, exonérés aux 3/4 jusqu'à
                  600 000 € par héritier, à 1/2 au-delà (art. 793 bis CGI). Groupement foncier rural : choisissez le
                  régime dominant (forêts ou terres agricoles). Société d'épargne forestière : forestier, au prorata de
                  l'actif éligible. Aucune : terre non louée par bail à long terme…
                </FieldHelp>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!!regimeRuralImpose}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="forestier">Forestier</SelectItem>
                  <SelectItem value="agricole">Agricole (bail à long terme)</SelectItem>
                  <SelectItem value="aucun">Aucune</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {watchedRegimeRural && watchedRegimeRural !== 'aucun' && (
            <FormField control={form.control} name="conditions_exoneration_rural" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Conditions de l'exonération
                  <FieldHelp>
                    {watchedRegimeRural === 'forestier'
                      ? "Certificat attestant que les bois présentent une garantie de gestion durable (plan simple de gestion ou équivalent). Les héritiers devront s'engager à les gérer ainsi pendant 30 ans."
                      : "Parts détenues depuis au moins 2 ans, statuts du groupement interdisant l'exploitation en faire-valoir direct, terres données à bail rural à long terme (18 ans au moins) ou à bail cessible. Les héritiers devront conserver les biens 5 ans."}
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Conditions remplies</SelectItem>
                    <SelectItem value="non">Conditions non remplies</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {watchedNature === NATURE_SEF && watchedRegimeRural === 'forestier' && watchedConditionsRural === true && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="fraction_eligible_rural" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Part de l'actif éligible (%)
                  <FieldHelp>
                    Fraction de l'actif de la société investie en bois, forêts et parts de groupements forestiers éligibles, selon l'attestation de la société de gestion. L'exonération des 3/4 ne porte que sur cette fraction.
                  </FieldHelp>
                </FormLabel>
                <FormControl>
                  <Input
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
        </div>
      )}

      {(isTerrain || isBois || isMaisonMobile || isLMNP || isDroitsSociaux || isNft || isMatieresPremieres) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isTerrain && (
            <FormField control={form.control} name="terrain_constructible" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Terrain à bâtir
                  <FieldHelp>
                    Terrain constructible : sa plus-value est exclue de la surtaxe sur les plus-values élevées. Première cession après classement en zone constructible : taxes spécifiques (art. 1529 et 1605 nonies CGI).
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Constructible</SelectItem>
                    <SelectItem value="non">Non constructible</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isBois && (
            <FormField control={form.control} name="surface_boisee_ha" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Surface boisée (ha)
                  <FieldHelp>
                    Sert à la réduction d'impôt sur la plus-value de cession : 10 € par hectare et par année de détention (art. 150 VF III CGI). Les fractions d'hectare ne comptent pas.
                  </FieldHelp>
                </FormLabel>
                <FormControl>
                  <Input
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isMaisonMobile && (
            <FormField control={form.control} name="fixe_au_sol" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fixée au sol
                  <FieldHelp>
                    Une péniche ou un mobil-home non fixé à demeure est un bien meuble (plus-value des biens meubles, art. 150 UA CGI). Fixé durablement sur une fondation, il est traité comme un immeuble.
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Fixée à demeure (immeuble)</SelectItem>
                    <SelectItem value="non">Non fixée (bien meuble)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isNft && (
            <FormField control={form.control} name="qualification_nft" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Qualification du NFT
                  <FieldHelp>
                    Le NFT n'a pas de régime fiscal propre : il suit celui de ce qu'il représente. Droits transférables
                    sur la blockchain : actif numérique (PFU). Droits financiers ou de gouvernance : titre financier (PFU).
                    Certificat d'une œuvre physique : œuvre d'art (taxe de 6,5 % ou plus-value réelle). À défaut :
                    bien meuble incorporel (plus-value réelle, abattement de 5 % par an après 2 ans).
                  </FieldHelp>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {QUALIFICATIONS_NFT.map(q => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isMatieresPremieres && (
            <FormField control={form.control} name="detention_matieres_premieres" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mode de détention
                  <FieldHelp>
                    Détention financière (tracker, ETC, contrat) : plus-value au PFU. Détention physique : bien meuble
                    (exonéré jusqu'à 5 000 €, sinon plus-value réelle avec abattement de 5 % par an après 2 ans).
                  </FieldHelp>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="financiere">Financière (tracker, ETC, contrat)</SelectItem>
                    <SelectItem value="physique">Physique</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isDroitsSociaux && (
            <FormField control={form.control} name="cession_depart_retraite" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cession au départ à la retraite
                  <FieldHelp>
                    Dirigeant qui cède ses titres en partant à la retraite (fonctions exercées 5 ans, au moins 25 %
                    du capital, retraite dans les 2 ans) : abattement fixe de 500 000 € sur l'impôt sur le revenu
                    (art. 150-0 D ter CGI). Les prélèvements sociaux restent dus sur toute la plus-value.
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Oui, conditions remplies</SelectItem>
                    <SelectItem value="non">Non</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isLMNP && (
            <FormField control={form.control} name="residence_services" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Résidence de services
                  <FieldHelp>
                    Résidence étudiante, seniors ou EHPAD : les amortissements déduits ne sont pas réintégrés dans la plus-value de cession (LF 2025).
                  </FieldHelp>
                </FormLabel>
                <Select
                  onValueChange={val => field.onChange(val === 'oui')}
                  value={field.value === true ? 'oui' : field.value === false ? 'non' : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="oui">Oui</SelectItem>
                    <SelectItem value="non">Non</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {(showCapitalGarantiVM || showModeSortie) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showCapitalGarantiVM && (
            <FormField control={form.control} name="capital_garanti" render={({ field }) => (
              <FormItem>
                <FormLabel>Capital garanti</FormLabel>
                <FormControl>
                  <EuroInput
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showModeSortie && (
            <FormField control={form.control} name="mode_sortie" render={({ field }) => (
              <FormItem>
                <FormLabel>Mode de sortie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir le mode de sortie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MODE_SORTIE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showRenvoiClauseArticle82 && (
                  <FieldHelp>
                    Avant la liquidation, le capital est versé au décès aux bénéficiaires de la clause, qui
                    se renseigne dans Transmission → Assurance-vie avec les cotisations versées.
                  </FieldHelp>
                )}
                <FormMessage />
              </FormItem>
            )} />
          )}

          {isPER && watchedNature !== NATURE_PER_TOUJOURS_ASSURANTIEL && (
            <FormField control={form.control} name="versements_deduits_pct" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Versements déduits du revenu (%)
                  <FieldHelp>
                    Part des versements volontaires déduits du revenu imposable. À la sortie en capital, cette
                    part du capital est imposée au barème ; le reste est exonéré. Les gains sont taxés dans
                    tous les cas (PFU ou barème, plus prélèvements sociaux).
                  </FieldHelp>
                </FormLabel>
                <FormControl>
                  <Input
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {isEpargneSalariale && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="abondement_employeur" render={({ field }) => (
            <FormItem>
              <FormLabel>Abondement employeur</FormLabel>
              <FormControl>
                <EuroInput
                  className="bg-background border-border shadow-none"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="date_disponibilite" render={({ field }) => (
            <FormItem>
              <FormLabel>Date de disponibilité / déblocage</FormLabel>
              <FormControl>
                <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="motif_deblocage_anticipe" render={({ field }) => (
            <FormItem>
              <FormLabel>Motif de déblocage anticipé</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Choisir le motif" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="support_investissement" render={({ field }) => (
            <FormItem>
              <FormLabel>Support d'investissement</FormLabel>
              <FormControl>
                <Input
                  className="bg-background border-border shadow-none"
                  placeholder="Ex. FCPE monétaire, FCPE actions diversifiées"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {isCTO && (
        <>
          <FormField
            control={form.control}
            name="cto_multi_actifs"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="flex items-center leading-none">
                  <FormLabel>Ce compte-titres détient d'autres actifs que des actions/obligations</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {watchedCtoMultiActifs && (
            <FormField control={form.control} name="cto_nature_sous_jacent" render={({ field }) => (
              <FormItem>
                <FormLabel>Nature réelle du sous-jacent principal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue placeholder="Choisir la nature du sous-jacent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CTO_SOUS_JACENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </>
      )}

      {(showTauxRemuneration || showDateEcheanceLiquidites) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDateEcheanceLiquidites && (
            <FormField control={form.control} name="date_echeance" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'échéance</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showTauxRemuneration && (
            <FormField control={form.control} name="taux_remuneration" render={({ field }) => (
              <FormItem>
                <FormLabel>Taux de rémunération (%)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showPlafondVerse && (
        <FormField control={form.control} name="plafond_verse" render={({ field }) => (
          <FormItem>
            <FormLabel>Montant versé</FormLabel>
            <FormControl>
              <EuroInput
                className="bg-background border-border shadow-none"
                type="number"
                step="0.01"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {(showDureeBlocage || showReductionIrEntree) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDureeBlocage && (
            <FormField control={form.control} name="duree_blocage" render={({ field }) => (
              <FormItem>
                <FormLabel>Durée de blocage</FormLabel>
                <FormControl>
                  <Input className="bg-background border-border shadow-none" placeholder="Ex. 5 ans, jusqu'au 31/12/2030" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showReductionIrEntree && (
            <FormField control={form.control} name="reduction_ir_entree" render={({ field }) => (
              <FormItem>
                <FormLabel>Réduction d'IR à l'entrée (%)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showMontantEngageAppele && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="montant_engage" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant engagé</FormLabel>
              <FormControl>
                <EuroInput
                  className="bg-background border-border shadow-none"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="montant_appele" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant appelé</FormLabel>
              <FormControl>
                <EuroInput
                  className="bg-background border-border shadow-none"
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {(showDateAttribution || showPrixExercice) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showDateAttribution && (
            <FormField control={form.control} name="date_attribution" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'attribution</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showPrixExercice && (
            <FormField control={form.control} name="prix_exercice" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Prix d'exercice
                  <FieldHelp>
                    Succession : options non levées au décès, exerçables par les héritiers dans les 6 mois. Leur prise en
                    compte dans l'actif taxable est discutée (exclusion, ou valeur intrinsèque : cours moins prix
                    d'exercice). Saisissez en valeur estimée la valeur intrinsèque totale, à faire confirmer par le notaire.
                  </FieldHelp>
                </FormLabel>
                <FormControl>
                  <EuroInput
                    className="bg-background border-border shadow-none"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {(showSousJacent || showDateEcheanceVM) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showSousJacent && (
            <FormField control={form.control} name="sous_jacent" render={({ field }) => (
              <FormItem>
                <FormLabel>Sous-jacent</FormLabel>
                <FormControl>
                  <Input className="bg-background border-border shadow-none" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {showDateEcheanceVM && (
            <FormField control={form.control} name="date_echeance" render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'échéance</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {showLieuStockageQuantite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="lieu_stockage" render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu de stockage</FormLabel>
              <FormControl>
                <Input className="bg-background border-border shadow-none" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="quantite" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantité</FormLabel>
              <FormControl>
                <Input className="bg-background border-border shadow-none" placeholder="Ex. 500g, 10 onces" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      {!isEpargneAV && !isPrevoyanceDeces(watchedNature) && !isCreance(watchedNature) && (
        <FormField
          control={form.control}
          name="attachement_emotionnel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attachement émotionnel</FormLabel>
              <FieldHelp>
                De 0 (aucun attachement) à 10 (attachement très fort)
              </FieldHelp>
              <FormControl>
                <div className="max-w-md space-y-2 pt-1">
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={[field.value || 0]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Aucun</span>
                    <span className="font-medium text-foreground">{field.value || 0} / 10</span>
                    <span>Très fort</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
