import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Scale, FileText, PiggyBank, Receipt, TrendingUp, Lightbulb, AlertCircle, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData, useMaritalStatus, useFamilyProfile } from '@/hooks/useFamilyData';
import { useLiberalites } from '@/hooks/useLiberalites';
import { usePassifs } from '@/hooks/usePassifs';
import { useAVContracts } from '@/hooks/useAVContracts';
import { buildFamilyGraph, buildPatrimonySnapshot, buildTransmissionLiberalites, buildAVContracts, AVDonneesInsuffisantesError } from '@/utils/transmissionHelpers';
import { computeTransmission, TransmissionContext } from '@/lib/transmission';
import { FamilyGraph, PatrimonySnapshot, TransmissionParams } from '@/lib/transmission/types';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
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
  const { avContractsRaw, loading: avLoading } = useAVContracts(assets);

  // Construire le graphe familial
  const familyGraph: FamilyGraph | null = useMemo(() => {
    if (!familyMembers || !familyProfile) return null;
    return buildFamilyGraph(familyProfile, maritalStatus, familyMembers);
  }, [familyMembers, familyProfile, maritalStatus]);

  // Convertir les libéralités : jointure live vers assets pour la valeur des
  // legs (jamais figée en base), et exclusion des legs caducs (bien légué
  // supprimé — cf. buildTransmissionLiberalites).
  const { liberalites: transmissionLiberalites, legsCaducs } = useMemo(
    () => buildTransmissionLiberalites(liberalites, assets),
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
      const patrimony = buildPatrimonySnapshot(assets, passifs, 0);
      // Répartition avant/après 70 ans à partir des vraies primes (av_operations) —
      // lève AVDonneesInsuffisantesError si un contrat n'a aucune opération
      // enregistrée ou si la date de naissance du défunt simulé est inconnue.
      const avContracts = buildAVContracts(avContractsRaw, familyProfile?.date_naissance, familyGraph);
      const ctx: TransmissionContext = {
        family: familyGraph,
        patrimony,
        liberalites: transmissionLiberalites,
        params,
        conjointOption: 'quart_pp',
        rawAssets: (assets || []) as any,
        avContracts,
        partageEnvisage: !!(maritalStatus as any)?.partage_envisage
      };
      return { patrimony, transmissionResult: computeTransmission(ctx), computeErrorMessage: null, computeErrorKind: null };
    } catch (error) {
      console.error('Erreur calcul transmission:', error);
      if (error instanceof BienNonQualifieError) {
        return { patrimony: null, transmissionResult: null, computeErrorMessage: error.message, computeErrorKind: 'bien-non-qualifie' };
      }
      if (error instanceof AVDonneesInsuffisantesError) {
        return { patrimony: null, transmissionResult: null, computeErrorMessage: error.message, computeErrorKind: 'av-donnees-insuffisantes' };
      }
      return { patrimony: null, transmissionResult: null, computeErrorMessage: null, computeErrorKind: null };
    }
  }, [familyGraph, assets, passifs, transmissionLiberalites, params, maritalStatus, avContractsRaw, familyProfile]);

  if (assetsLoading || familyLoading || liberalitesLoading || avLoading) {
    return (
      <div className="kairos-transmission">
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
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
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Processus de calcul de transmission</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Alert className="bg-[var(--surface-sunken)] border-[var(--border)]">
              <AlertCircle className="h-4 w-4 text-[var(--ink-400)]" />
              <AlertDescription className="text-[var(--text-secondary)]">
                {computeErrorMessage || "Veuillez d'abord renseigner votre situation familiale et votre patrimoine pour visualiser le processus de calcul."}
              </AlertDescription>
            </Alert>
            {computeErrorKind === 'av-donnees-insuffisantes' && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/transmission?tab=assurance-vie')}
                className="gap-2 mt-4 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
              >
                Renseigner le contrat dans Assurance-vie
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {computeErrorKind === 'bien-non-qualifie' && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/patrimoine?tab=actifs')}
                className="gap-2 mt-4 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
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
  const calculSteps = [
    {
      icon: Users,
      title: "1. Dévolution civile",
      description: "Détermination des héritiers légaux et de leurs parts civiles",
      details: [
        `Nombre d'enfants héritiers : ${nbEnfants}`,
        `Conjoint survivant : ${hasConjoint ? 'Oui (option 1/4 en pleine propriété)' : 'Non'}`,
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
        `Donations antérieures : ${transmissionLiberalites.filter(l => l.type === 'donation').reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')} €`,
        `Legs consentis : ${transmissionLiberalites.filter(l => l.type === 'legs').reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')} €`,
        `= Masse de calcul : ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} €`,
        legsCaducs.length > 0
          ? `⚠️ ${legsCaducs.length} legs caduc${legsCaducs.length > 1 ? 's' : ''} exclu${legsCaducs.length > 1 ? 's' : ''} du calcul (bien légué introuvable) : ${legsCaducs.map(l => l.denomination).join(', ')}`
          : null
      ].filter(Boolean),
      formula: `${patrimony.biensExistants.toLocaleString('fr-FR')} - ${patrimony.passifs.toLocaleString('fr-FR')} + ${transmissionLiberalites.reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')} = ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} €`,
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
      formula: `Réserve = ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} × ${nbEnfants}/${nbEnfants + 1} = ${transmissionResult.reserve.toLocaleString('fr-FR')} €`,
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

  return (
    <div className="kairos-transmission space-y-6">
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
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

                  <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)] p-3">
                    <p className="kairos-num text-sm font-mono text-[var(--text-primary)]">{step.formula}</p>
                  </div>
                </div>

                {/* Colonne droite : Conseils */}
                <div className="lg:col-span-1">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)] p-4 space-y-3 h-full">
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
                <Separator className="my-6 bg-[var(--border)]" />
              )}
            </div>
          ))}

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)] p-6">
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