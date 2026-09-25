import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Scale, FileText, PiggyBank, Receipt, TrendingUp, Lightbulb, AlertCircle, ArrowRight, UserSquare2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData, useMaritalStatus, useFamilyProfile } from '@/hooks/useFamilyData';
import { useLiberalites } from '@/hooks/useLiberalites';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useAVContracts } from '@/hooks/useAVContracts';
import { useRecompenses } from '@/hooks/useRecompenses';
import { useCreancesEntreEpoux } from '@/hooks/useCreancesEntreEpoux';
import { usePatrimoineOriginaire } from '@/hooks/usePatrimoineOriginaire';
import { usePatrimoineFinal } from '@/hooks/usePatrimoineFinal';
import {
  buildFamilyGraph,
  buildPatrimonySnapshot,
  buildPassifLines,
  buildTransmissionLiberalites,
  buildAVContracts,
  buildRecompensesCalcInput,
  buildCreancesCalcInput,
  buildParticipationAcquetsContext,
  computeAVReintegrationCivile,
  AVDonneesInsuffisantesError
} from '@/utils/transmissionHelpers';
import { computeTransmission, TransmissionContext, ConjointOption } from '@/lib/transmission';
import { FamilyGraph, PatrimonySnapshot, TransmissionParams } from '@/lib/transmission/types';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import transmissionParamsData from '@/data/transmission-params.json';
import { Alert, AlertDescription } from '@/components/ui/alert';
import './kairos-transmission.css';

export const ProcessusCalcul = () => {
  const navigate = useNavigate();
  const { assets, loading: assetsLoading } = useAssets();
  const { familyMembers, loading: familyLoading } = useFamilyData();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyProfile } = useFamilyProfile();
  const { liberalites, loading: liberalitesLoading } = useLiberalites();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { avContractsRaw, loading: avLoading } = useAVContracts(assets);
  const { data: recompenses, loading: recompensesLoading } = useRecompenses();
  const { data: creancesEntreEpoux, loading: creancesLoading } = useCreancesEntreEpoux();
  const { data: patrimoineOriginaire, loading: patrimoineOriginaireLoading } = usePatrimoineOriginaire();
  const { data: patrimoineFinal, loading: patrimoineFinalLoading } = usePatrimoineFinal();
  const [assetDemembrements, setAssetDemembrements] = useState<AssetDemembrement[]>([]);

  useEffect(() => {
    assetDemembrementService.getAllForUser()
      .then(setAssetDemembrements)
      .catch(() => {
        setAssetDemembrements([]);
        toast.error("Impossible de charger les démembrements");
      });
  }, []);

  // Démembrement (barème 669 CGI) des actifs déjà en Usufruit/Nue-propriété —
  // même pondération que le Résumé Patrimoine (usePatrimoineCalculations.ts).
  const demembrementCtx: DemembrementFractionContext = useMemo(
    () => ({ familyProfile, maritalStatus, familyLinks: familyMembers }),
    [familyProfile, maritalStatus, familyMembers]
  );

  // Construire le graphe familial
  const familyGraph: FamilyGraph | null = useMemo(() => {
    if (!familyMembers || !familyProfile) return null;
    return buildFamilyGraph(familyProfile, maritalStatus, familyMembers);
  }, [familyMembers, familyProfile, maritalStatus]);

  // Convertir les libéralités : jointure live vers assets pour la valeur des
  // legs (jamais figée en base), et exclusion des legs caducs (bien légué
  // supprimé — cf. buildTransmissionLiberalites).
  const { liberalites: transmissionLiberalites, legsCaducs } = useMemo(
    () => buildTransmissionLiberalites(liberalites, assets, true),
    [liberalites, assets]
  );

  const params: TransmissionParams = useMemo(() => {
    const rawParams = transmissionParamsData as any;
    return {
      ...rawParams,
      abattements: {
        ...rawParams.abattements,
        conjoint: rawParams.abattements.conjoint === "Infinity" ? Infinity : rawParams.abattements.conjoint
      }
    } as TransmissionParams;
  }, []);

  // Patrimoine + calcul de transmission regroupés dans le même useMemo : les
  // deux peuvent lever BienNonQualifieError (buildPatrimonySnapshot pondère
  // déjà chaque bien, cf. lib/patrimoine/succession.ts::getPartSuccessorale),
  // donc les deux doivent être dans le même try/catch pour que le message
  // précis atteigne l'écran au lieu de crasher le rendu.
  const { patrimony, transmissionResult, computeErrorMessage, computeErrorKind } = useMemo((): {
    patrimony: PatrimonySnapshot | null;
    transmissionResult: ReturnType<typeof computeTransmission> | null;
    computeErrorMessage: string | null;
    computeErrorKind: 'bien-non-qualifie' | 'av-donnees-insuffisantes' | null;
  } => {
    if (!familyGraph) return { patrimony: null, transmissionResult: null, computeErrorMessage: null, computeErrorKind: null };

    try {
      // Assurance-vie non séparée ici : pas de régression, à traiter séparément si besoin
      const patrimony = buildPatrimonySnapshot(assets, buildPassifLines(passifs, emprunts, 'user'), 0, assetDemembrements, demembrementCtx);
      // Répartition avant/après 70 ans à partir des vraies primes (av_operations) —
      // lève AVDonneesInsuffisantesError si un contrat n'a aucune opération
      // enregistrée ou si la date de naissance du souscripteur réel (utilisateur
      // ou conjoint, cf. row.detenteur) est inconnue.
      const avContracts = buildAVContracts(
        avContractsRaw,
        familyProfile?.date_naissance,
        familyGraph,
        new Date().toISOString().split('T')[0],
        (maritalStatus as any)?.date_naissance_conjoint
      );
      // regime_matrimonial n'a de sens que sous Marié(e) : ce champ n'est
      // jamais effacé en changeant de statut (cf. RelationInfoForm.tsx), donc
      // un ex-marié devenu Pacsé/Concubin peut garder une valeur périmée.
      const regimeMatrimonialSiMarie = (maritalStatus as any)?.statut_couple === 'Marié(e)'
        ? (maritalStatus as any)?.regime_matrimonial
        : undefined;
      const ctx: TransmissionContext = {
        family: familyGraph,
        patrimony,
        liberalites: transmissionLiberalites,
        params,
        // Même source que Synthese.tsx/Succession2ndDeces.tsx : l'option
        // enregistrée dans l'onglet Optimisation, jamais une valeur figée.
        conjointOption: ((maritalStatus as any)?.option_conjoint as ConjointOption | null) || undefined,
        rawAssets: assets || [],
        assetDemembrements,
        demembrementCtx,
        avContracts,
        // Contrat AV détenu par le conjoint survivant, non dénoué puisque
        // l'Utilisateur décède en premier ici : réintégré civilement (doctrine
        // Ciot, §9.6.1) sous régime de communauté + origine_fonds deniers
        // communs, jamais dans avContracts (déjà filtré par détenteur dans
        // computeTransmission).
        avReintegrationCivileMontant: computeAVReintegrationCivile(avContracts, 'spouse', regimeMatrimonialSiMarie),
        partageEnvisage: !!(maritalStatus as any)?.partage_envisage,
        duhOpte: !!(maritalStatus as any)?.duh_opte,
        regimeMatrimonial: regimeMatrimonialSiMarie,
        recompenses: buildRecompensesCalcInput(recompenses),
        creancesEntreEpoux: buildCreancesCalcInput(creancesEntreEpoux),
        participationAcquets: buildParticipationAcquetsContext(patrimoineOriginaire, patrimoineFinal, false)
      };
      return { patrimony, transmissionResult: computeTransmission(ctx), computeErrorMessage: null, computeErrorKind: null };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur calcul transmission:', error);
      }
      if (error instanceof BienNonQualifieError) {
        return { patrimony: null, transmissionResult: null, computeErrorMessage: error.message, computeErrorKind: 'bien-non-qualifie' };
      }
      if (error instanceof AVDonneesInsuffisantesError) {
        return { patrimony: null, transmissionResult: null, computeErrorMessage: error.message, computeErrorKind: 'av-donnees-insuffisantes' };
      }
      return { patrimony: null, transmissionResult: null, computeErrorMessage: null, computeErrorKind: null };
    }
  }, [
    familyGraph, assets, passifs, emprunts, transmissionLiberalites, params, maritalStatus, avContractsRaw, familyProfile,
    recompenses, creancesEntreEpoux, patrimoineOriginaire, patrimoineFinal, assetDemembrements, demembrementCtx
  ]);

  if (
    assetsLoading || familyLoading || liberalitesLoading || avLoading ||
    recompensesLoading || creancesLoading || patrimoineOriginaireLoading || patrimoineFinalLoading
  ) {
    return (
      <div className="kairos-transmission">
        <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Processus de calcul de transmission</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">Chargement des données...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!familyGraph || !transmissionResult || !patrimony) {
    return (
      <div className="kairos-transmission">
        <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Processus de calcul de transmission</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Alert className="bg-[var(--surface-sunken)] border-[var(--kt-border)]">
              <AlertCircle className="h-4 w-4 text-[var(--ink-400)]" />
              <AlertDescription className="text-[var(--text-secondary)]">
                {computeErrorMessage || "Veuillez d'abord renseigner votre situation familiale et votre patrimoine pour visualiser le processus de calcul."}
              </AlertDescription>
            </Alert>
            {computeErrorKind === 'av-donnees-insuffisantes' && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/transmission?tab=assurance-vie')}
                className="gap-2 mt-4 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--kt-border-strong)] rounded-[var(--radius-lg)]"
              >
                Renseigner le contrat dans Assurance-vie
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {computeErrorKind === 'bien-non-qualifie' && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/patrimoine?tab=actifs')}
                className="gap-2 mt-4 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--kt-border-strong)] rounded-[var(--radius-lg)]"
              >
                Qualifier ce bien dans Patrimoine
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Nombre de souches réellement héritières (décès et renonciations déjà
  // pris en compte par calculateSuccessionLegale) — ne pas le redériver
  // localement de familyGraph.childrenOfDecedent, qui liste tous les
  // enfants au sens civil sans refléter les souches actives.
  const nbEnfants = transmissionResult.nbSouchesEnfants;
  const hasConjoint = familyGraph.hasSurvivingSpouse;
  // Libellé dérivé des droits réellement attribués par le moteur (l'option
  // enregistrée peut être écartée, ex. 100 % usufruit impossible en présence
  // d'un enfant non commun sans DDV) plutôt que de l'option demandée.
  const TYPE_QUOTE_PART_LABEL: Record<string, string> = {
    pleine_propriete: 'en pleine propriété',
    usufruit: 'en usufruit',
    nue_propriete: 'en nue-propriété'
  };
  const totalDonations = transmissionLiberalites.filter(l => l.type === 'donation').reduce((s, l) => s + l.valeur, 0);
  const optionConjointLabel = transmissionResult.heirs
    .filter(h => h.lien === 'conjoint')
    .map(h => `${(h.partCivile / transmissionResult.masseCalcul * 100).toFixed(1)}% ${TYPE_QUOTE_PART_LABEL[h.typeQuotePart as string] ?? ''}`.trim())
    .join(' + ');
  const calculSteps = [
    {
      icon: Users,
      title: "1. Dévolution civile",
      description: "Détermination des héritiers légaux et de leurs parts civiles",
      details: [
        `Nombre d'enfants héritiers : ${nbEnfants}`,
        `Conjoint survivant : ${hasConjoint ? `Oui (${optionConjointLabel})` : 'Non'}`,
        `Héritiers identifiés : ${transmissionResult.heirs.length}`,
        ...transmissionResult.heirs.map(h => 
          `• ${h.nom} (${h.lien}) : ${(h.partCivile / transmissionResult.masseCalcul * 100).toFixed(1)}% civil`
        )
      ],
      formula: `Part civile totale = 100% (répartie selon ordre légal)`,
      conseils: [
        "Si vous souhaitez modifier la répartition légale, pensez à rédiger un testament",
        hasConjoint ? "Le conjoint peut choisir entre 1/4 PP, usufruit total, ou mixte selon ses besoins" : null,
        nbEnfants > 1 ? "Avec plusieurs enfants, attention à l'égalité des parts pour éviter les conflits" : null,
        "Consultez un notaire pour optimiser l'option du conjoint selon votre situation patrimoniale"
      ].filter(Boolean)
    },
    {
      icon: Calculator,
      title: "2. Masse de calcul",
      description: "Reconstitution du patrimoine fictif pour le calcul de la réserve",
      details: [
        `Patrimoine net : ${(patrimony.biensExistants - patrimony.passifs).toLocaleString('fr-FR')} €`,
        transmissionResult.reintegrationsCiviles !== 0
          ? `Réintégrations civiles (récompenses, créances entre époux, participation, assurance-vie non dénouée du conjoint) : ${transmissionResult.reintegrationsCiviles.toLocaleString('fr-FR')} €`
          : null,
        `Donations antérieures : ${totalDonations.toLocaleString('fr-FR')} €`,
        `Legs consentis (déjà compris dans le patrimoine, non ajoutés) : ${transmissionLiberalites.filter(l => l.type === 'legs').reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')} €`,
        `= Masse de calcul : ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} €`,
        legsCaducs.length > 0
          ? `⚠️ ${legsCaducs.length} legs caduc${legsCaducs.length > 1 ? 's' : ''} exclu${legsCaducs.length > 1 ? 's' : ''} du calcul (bien légué introuvable) : ${legsCaducs.map(l => l.denomination).join(', ')}`
          : null
      ].filter(Boolean),
      // Même composition que reserve.ts::computeMasseCalcul : biens (y compris
      // réintégrations civiles) - passif + donations ; les legs portent sur
      // des biens déjà présents et ne sont jamais rajoutés.
      formula: `${patrimony.biensExistants.toLocaleString('fr-FR')}${transmissionResult.reintegrationsCiviles !== 0 ? ` + ${transmissionResult.reintegrationsCiviles.toLocaleString('fr-FR')}` : ''} - ${patrimony.passifs.toLocaleString('fr-FR')} + ${totalDonations.toLocaleString('fr-FR')} = ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} €`,
      conseils: [
        "Les donations faites il y a moins de 15 ans sont réintégrées dans la masse",
        patrimony.passifs > 0 ? "Vos dettes viennent réduire l'assiette taxable - conservez les justificatifs" : null,
        "Pensez à valoriser correctement vos biens pour éviter un redressement fiscal",
        transmissionLiberalites.length > 0 ? "Vos libéralités antérieures impactent le calcul de la réserve" : null
      ].filter(Boolean)
    },
    {
      icon: Scale,
      title: "3. Réserve héréditaire et quotité disponible",
      description: "Calcul de la part protégée et de la part librement disponible",
      details: [
        `Réserve héréditaire : ${transmissionResult.reserve.toLocaleString('fr-FR')} € (${(transmissionResult.reserve / transmissionResult.masseCalcul * 100).toFixed(1)}%)`,
        `Quotité disponible : ${transmissionResult.quotiteDisponible.toLocaleString('fr-FR')} € (${(transmissionResult.quotiteDisponible / transmissionResult.masseCalcul * 100).toFixed(1)}%)`,
        `Barème appliqué : ${nbEnfants} enfant${nbEnfants > 1 ? 's' : ''}`,
        nbEnfants === 1 ? "• 1 enfant : réserve 1/2, QD 1/2" : 
        nbEnfants === 2 ? "• 2 enfants : réserve 2/3, QD 1/3" :
        "• 3 enfants ou + : réserve 3/4, QD 1/4"
      ],
      formula: `Réserve = ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} × ${nbEnfants === 1 ? '1/2' : nbEnfants === 2 ? '2/3' : '3/4'} = ${transmissionResult.reserve.toLocaleString('fr-FR')} €`,
      conseils: [
        "La réserve protège vos enfants : vous ne pouvez pas en disposer librement",
        `Vous pouvez donner librement ${(transmissionResult.quotiteDisponible / transmissionResult.masseCalcul * 100).toFixed(0)}% de votre patrimoine`,
        nbEnfants >= 3 ? "Avec 3 enfants ou plus, la quotité disponible est limitée à 1/4" : null,
        "Utilisez la quotité disponible pour gratifier un tiers ou avantager un enfant"
      ].filter(Boolean)
    },
    {
      icon: FileText,
      title: "4. Imputation des libéralités",
      description: "Vérification que les donations et legs respectent la réserve",
      details: [
        `Total des libéralités : ${transmissionLiberalites.reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')} €`,
        `Imputé sur quotité disponible : ${Math.min(transmissionResult.quotiteDisponible, transmissionLiberalites.reduce((s, l) => s + l.valeur, 0)).toLocaleString('fr-FR')} €`,
        transmissionLiberalites.reduce((s, l) => s + l.valeur, 0) > transmissionResult.quotiteDisponible
          ? `⚠️ Dépassement de la quotité : ${(transmissionLiberalites.reduce((s, l) => s + l.valeur, 0) - transmissionResult.quotiteDisponible).toLocaleString('fr-FR')} €`
          : "✓ Quotité disponible respectée",
        "Ordre d'imputation : donations puis legs"
      ],
      formula: transmissionLiberalites.reduce((s, l) => s + l.valeur, 0) > transmissionResult.quotiteDisponible
        ? "QD dépassée → imputation sur la réserve (réduction nécessaire)"
        : "Total libéralités ≤ QD → respect de la réserve",
      conseils: [
        transmissionLiberalites.reduce((s, l) => s + l.valeur, 0) > transmissionResult.quotiteDisponible
          ? "⚠️ Vos libéralités entament la réserve : elles seront réduites"
          : "✓ Vos libéralités sont compatibles avec la réserve héréditaire",
        "Les donations sont imputées avant les legs",
        "Privilégiez les donations-partages pour éviter les réductions futures",
        transmissionLiberalites.length > 0 ? "Vérifiez régulièrement la compatibilité de vos libéralités avec votre patrimoine" : null
      ].filter(Boolean)
    },
    {
      icon: TrendingUp,
      title: "5. Réduction des libéralités",
      description: "Réduction des libéralités excessives pour protéger la réserve",
      details: transmissionResult.details.reductions.length > 0 ? [
        `Nombre de libéralités réduites : ${transmissionResult.details.reductions.length}`,
        ...transmissionResult.details.reductions.map(r => {
          const lib = transmissionLiberalites.find(l => l.id === r.liberaliteId);
          return `• ${lib?.beneficiaireName || 'Bénéficiaire'} : réduction de ${r.montantReduit.toLocaleString('fr-FR')} €`;
        }),
        "Les legs sont réduits en priorité, puis les donations des plus récentes aux plus anciennes"
      ] : [
        "✓ Aucune réduction nécessaire",
        "Vos libéralités respectent la réserve héréditaire",
        "Les parts des héritiers réservataires sont protégées"
      ],
      formula: transmissionResult.details.reductions.length > 0
        ? `Réduction totale = ${transmissionResult.details.reductions.reduce((s, r) => s + r.montantReduit, 0).toLocaleString('fr-FR')} €`
        : "Pas de réduction nécessaire",
      conseils: [
        transmissionResult.details.reductions.length > 0
          ? "⚠️ Certaines libéralités seront réduites au décès pour protéger la réserve"
          : "✓ Vos libéralités sont sécurisées",
        "Pour éviter toute réduction, limitez vos libéralités à la quotité disponible",
        "Les donations-partages rapportables évitent les réductions",
        transmissionResult.details.reductions.length > 0 ? "Consultez un notaire pour réorganiser vos libéralités" : null
      ].filter(Boolean)
    },
    {
      icon: PiggyBank,
      title: "6. Rapport des donations",
      description: "Égalisation des parts entre héritiers lors du partage",
      details: transmissionResult.details.rapports.length > 0 ? [
        `Donations rapportables : ${transmissionResult.details.rapports.length}`,
        ...transmissionResult.details.rapports.map(r => {
          const person = familyGraph.persons.find(p => p.id === r.personId);
          return `• ${person?.prenom} ${person?.nom} : ${r.montantRapport.toLocaleString('fr-FR')} € à rapporter`;
        }),
        "Le rapport permet d'égaliser les parts entre cohéritiers"
      ] : [
        "Aucune donation rapportable",
        "Le partage se fera sans rapport",
        "Tous les héritiers reçoivent leur part civile directement"
      ],
      formula: transmissionResult.details.rapports.length > 0
        ? `Masse partageable ajustée selon les rapports`
        : "Masse partageable = Actif net",
      conseils: [
        "Le rapport ne s'applique qu'aux donations rapportables (sauf mention 'hors part')",
        transmissionResult.details.rapports.length > 0 ? "Les enfants ayant reçu des donations devront les rapporter au partage" : null,
        "Vous pouvez faire des donations 'hors part' dans la limite de la quotité disponible",
        "Le rapport fictif n'oblige pas à rembourser : il ajuste les parts au partage"
      ].filter(Boolean)
    },
    {
      icon: Receipt,
      title: "7. Fiscalité de la transmission",
      description: "Calcul des droits de succession et prélèvements",
      details: [
        `Total droits de succession : ${transmissionResult.dmtg.totals.droitsTotaux.toLocaleString('fr-FR')} €`,
        `Prélèvement 990 I (AV) : ${transmissionResult.dmtg.totals.prelev990I.toLocaleString('fr-FR')} €`,
        `Frais de notaire : ${transmissionResult.fraisNotaire.toLocaleString('fr-FR')} €`,
        `= Coût fiscal total : ${(transmissionResult.dmtg.totals.droitsTotaux + transmissionResult.fraisNotaire).toLocaleString('fr-FR')} €`,
        "",
        "Détail par héritier :",
        ...transmissionResult.heirs.map(h => {
          const dmtgHeir = transmissionResult.dmtg.perBeneficiary[h.personId];
          return `• ${h.nom} : ${(dmtgHeir?.droitsTotaux || 0).toLocaleString('fr-FR')} € (sur ${(dmtgHeir?.baseApresFrais || 0).toLocaleString('fr-FR')} €)`;
        })
      ],
      formula: `Taux effectif = ${((transmissionResult.dmtg.totals.droitsTotaux / patrimony.biensExistants) * 100).toFixed(1)}%`,
      conseils: [
        hasConjoint ? "✓ Le conjoint est totalement exonéré de droits de succession" : null,
        `Abattement de 100 000 € par enfant renouvelable tous les 15 ans`,
        transmissionResult.dmtg.totals.droitsTotaux > 50000 ? "⚠️ Coût fiscal élevé : étudiez les stratégies d'optimisation (donations, démembrement, etc.)" : null,
        "L'assurance-vie bénéficie d'un régime fiscal très favorable (152 500 € d'abattement par bénéficiaire)",
        `Transmission nette aux héritiers : ${transmissionResult.transmissionNette.toLocaleString('fr-FR')} €`
      ].filter(Boolean)
    }
  ];

  // Détail par héritier (façon étude notariale) : agrège pour chaque personne
  // sa part successorale (dmtg.perBeneficiary), ses donations antérieures
  // (transmissionLiberalites) et son capital d'assurance-vie net déjà calculés
  // ailleurs — aucune nouvelle logique fiscale ici, uniquement de l'agrégation
  // d'affichage (cf. netBreakdown.ts, dmtg/index.ts, comment de TransmissionResult
  // sur la source unique de vérité).
  const heritierDetails = (() => {
    // Identité (nom/lien) par personId — dédupliquée depuis `heirs`, qui peut
    // contenir plusieurs lignes par personne en cas de démembrement
    // (usufruit + nue-propriété). `partFinale` n'est PAS utilisé ici : c'est
    // une part de la masse de calcul (patrimoine + donations rapportées,
    // cf. transmission/index.ts ~L367-403), pas le patrimoine réellement
    // transmis — l'"héritage brut" ci-dessous vient de dmtg.baseApresFrais,
    // qui est la même base que celle déjà affichée à l'étape 7 ("sur X €").
    const identites = new Map<string, { personId: string; nom: string; lien: string }>();
    transmissionResult.heirs.forEach(h => {
      if (!identites.has(h.personId)) {
        identites.set(h.personId, { personId: h.personId, nom: h.nom, lien: h.lien });
      }
    });
    // Légataires non héritiers : même détail fiscal que les héritiers.
    (transmissionResult.legataires || []).forEach(l => {
      if (!identites.has(l.personId)) {
        identites.set(l.personId, { personId: l.personId, nom: l.nom, lien: l.lien });
      }
    });

    return Array.from(identites.values()).map(g => {
      const dmtgHeir = transmissionResult.dmtg.perBeneficiary[g.personId];
      // Sentinelle 'conjoint' (liberalites.beneficiaire_conjoint) : même
      // résolution que computeTransmission, vers le conjoint du graphe.
      const donationsHeritier = transmissionLiberalites.filter(l => l.type === 'donation' && (
        l.beneficiaireId === g.personId ||
        (l.beneficiaireId === 'conjoint' && g.personId === transmissionResult.family.survivingSpouseId)
      ));
      const donationsBrutes = donationsHeritier.reduce((s, l) => s + l.valeur, 0);
      const reductionTotal = transmissionResult.details.reductions
        .filter(r => donationsHeritier.some(l => l.id === r.liberaliteId))
        .reduce((s, r) => s + r.montantReduit, 0);
      const donationsNettes = donationsBrutes - reductionTotal;

      const heritageBrut = dmtgHeir?.baseApresFrais ?? 0;
      const abattement = dmtgHeir?.allowanceGeneralResidual ?? 0;
      const partNetteTaxable = dmtgHeir?.taxableAfterAllowance ?? 0;
      const droitsSuccession = dmtgHeir?.droitsHorsAV ?? 0;
      const heritageNet = heritageBrut - droitsSuccession;
      const capitalAVNet = dmtgHeir?.capitalAVNet ?? 0;
      const prelev990I = dmtgHeir?.prelev990I ?? 0;
      const droitsTotaux = dmtgHeir?.droitsTotaux ?? 0;
      const transmissionNetteHeritier = heritageNet + donationsNettes + capitalAVNet;
      const tauxMoyenSuccession = heritageBrut > 0 ? (droitsSuccession / heritageBrut) * 100 : 0;
      // Taux de couverture des droits par les capitaux décès (même logique que le
      // tableau "Transmission et droits" d'une étude notariale) : les capitaux AV
      // nets couvrent-ils les droits totaux dus par cet héritier ?
      const tauxCouverture = droitsTotaux > 0
        ? (capitalAVNet >= droitsTotaux ? '> 100 %' : `${((capitalAVNet / droitsTotaux) * 100).toFixed(0)} %`)
        : (capitalAVNet > 0 ? '> 100 %' : '—');

      return {
        personId: g.personId,
        nom: g.nom,
        lien: g.lien,
        heritageBrut,
        abattement,
        partNetteTaxable,
        droitsSuccession,
        tauxMoyenSuccession,
        heritageNet,
        donationsNettes,
        reductionTotal,
        capitalAVNet,
        prelev990I,
        droitsTotaux,
        transmissionNetteHeritier,
        tauxCouverture
      };
    });
  })();

  const totalTransmissionNette = heritierDetails.reduce((s, h) => s + h.transmissionNetteHeritier, 0);

  return (
    <div className="kairos-transmission space-y-6">
      <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <Calculator className="h-5 w-5 text-[var(--ink-400)]" />
            Processus de calcul de transmission
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Méthodologie complète de calcul de la transmission successorale
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-8">
          {calculSteps.map((step, index) => (
            <div key={index} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne gauche : Calcul détaillé */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--ink-050)]">
                      <step.icon className="h-5 w-5 text-[var(--ink-700)]" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Détails du calcul :</h4>
                    <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="pl-4">
                          {detail.startsWith('•') || detail.startsWith('✓') || detail.startsWith('⚠️') ? detail : `• ${detail}`}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--kt-border)] p-3">
                    <p className="kairos-num text-sm font-mono text-[var(--text-primary)]">{step.formula}</p>
                  </div>
                </div>

                {/* Colonne droite : Conseils */}
                <div className="lg:col-span-1">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--surface-sunken)] p-4 space-y-3 h-full">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <Lightbulb className="h-4 w-4 text-[var(--ink-400)]" />
                      <h4 className="text-sm font-semibold">Conseils pratiques</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                      {step.conseils.map((conseil, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[var(--ink-400)] mt-0.5">→</span>
                          <span>{conseil}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {index < calculSteps.length - 1 && (
                <Separator className="my-6 bg-[var(--kt-border)]" />
              )}
            </div>
          ))}

          <Separator className="my-6 bg-[var(--kt-border)]" />

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--ink-050)]">
                <UserSquare2 className="h-5 w-5 text-[var(--ink-700)]" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Détail par héritier</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vue consolidée de ce que reçoit chaque héritier au titre de la succession, des donations
                  antérieures et de l'assurance-vie — donations et capitaux décès inclus, contrairement au
                  "Transmission nette" de l'onglet Synthèse qui ne couvre que le net de succession.
                </p>
              </div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--kt-border)]">
                    <TableHead className="text-[var(--text-secondary)]">Héritier</TableHead>
                    <TableHead className="text-right text-[var(--text-secondary)]">Héritage brut</TableHead>
                    <TableHead className="text-right text-[var(--text-secondary)]">Droits de succession</TableHead>
                    <TableHead className="text-right text-[var(--text-secondary)]">Capitaux décès nets</TableHead>
                    <TableHead className="text-right text-[var(--text-secondary)]">Taux de couverture</TableHead>
                    <TableHead className="text-right font-semibold text-[var(--text-secondary)]">Transmission nette</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heritierDetails.map(h => (
                    <TableRow key={h.personId} className="border-[var(--kt-border)]">
                      <TableCell>
                        <span className="font-medium text-[var(--text-primary)]">{h.nom}</span>
                        <span className="text-xs text-[var(--text-secondary)] ml-1.5">({h.lien})</span>
                      </TableCell>
                      <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{h.heritageBrut.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{h.droitsSuccession.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{h.capitalAVNet.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{h.tauxCouverture}</TableCell>
                      <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{h.transmissionNetteHeritier.toLocaleString('fr-FR')} €</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-[var(--kt-border-strong)]">
                    <TableCell className="font-semibold text-[var(--text-primary)]">Total</TableCell>
                    <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{heritierDetails.reduce((s, h) => s + h.heritageBrut, 0).toLocaleString('fr-FR')} €</TableCell>
                    <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{heritierDetails.reduce((s, h) => s + h.droitsSuccession, 0).toLocaleString('fr-FR')} €</TableCell>
                    <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{heritierDetails.reduce((s, h) => s + h.capitalAVNet, 0).toLocaleString('fr-FR')} €</TableCell>
                    <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">—</TableCell>
                    <TableCell className="kairos-num text-right tabular-nums font-bold text-[var(--text-primary)]">{totalTransmissionNette.toLocaleString('fr-FR')} €</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {heritierDetails.map(h => (
                <div key={h.personId} className="rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--surface-sunken)] p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{h.nom} <span className="font-normal text-[var(--text-secondary)]">({h.lien})</span></h4>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Succession</p>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Héritage brut</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.heritageBrut.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Abattement disponible</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.abattement === Infinity ? 'Illimité' : `${h.abattement.toLocaleString('fr-FR')} €`}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Part nette taxable</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.partNetteTaxable.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Droits de succession</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.droitsSuccession.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Taux moyen d'imposition</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.tauxMoyenSuccession.toFixed(2)} %</dd></div>
                    </dl>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Transmission du patrimoine</p>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Héritage net</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.heritageNet.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Donations nettes</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.donationsNettes.toLocaleString('fr-FR')} €</dd></div>
                      {h.reductionTotal > 0 && (
                        <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Donations réduites en valeur</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.reductionTotal.toLocaleString('fr-FR')} €</dd></div>
                      )}
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Capitaux décès nets</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.capitalAVNet.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between font-semibold"><dt className="text-[var(--text-primary)]">Transmission nette</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.transmissionNetteHeritier.toLocaleString('fr-FR')} €</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Droits de mutation</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.droitsSuccession.toLocaleString('fr-FR')} €</dd></div>
                      {h.prelev990I > 0 && (
                        <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Prélèvement sur les capitaux décès</dt><dd className="kairos-num tabular-nums text-[var(--text-primary)]">{h.prelev990I.toLocaleString('fr-FR')} €</dd></div>
                      )}
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--surface-sunken)] p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
              <TrendingUp className="h-5 w-5 text-[var(--ink-400)]" />
              Synthèse du processus
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Le calcul de transmission successorale suit un processus en 7 étapes interdépendantes.
              Chaque étape s'appuie sur les résultats de la précédente pour aboutir à la détermination
              des parts finales de chaque héritier et du coût fiscal global de la transmission.
              Ce processus garantit le respect des règles du Code civil (protection de la réserve héréditaire)
              tout en permettant d'optimiser la fiscalité selon les dispositifs légaux disponibles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};