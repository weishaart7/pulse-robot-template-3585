import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Scale, FileText, PiggyBank, Receipt, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData, useMaritalStatus, useFamilyProfile } from '@/hooks/useFamilyData';
import { useLiberalites } from '@/hooks/useLiberalites';
import { usePassifs } from '@/hooks/usePassifs';
import { computeTransmission, TransmissionContext } from '@/lib/transmission';
import { FamilyGraph, PatrimonySnapshot, Liberalite, TransmissionParams } from '@/lib/transmission/types';
import transmissionParamsData from '@/data/transmission-params.json';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ProcessusCalcul = () => {
  const { assets, loading: assetsLoading } = useAssets();
  const { familyMembers, loading: familyLoading } = useFamilyData();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyProfile } = useFamilyProfile();
  const { liberalites, loading: liberalitesLoading } = useLiberalites();
  const { passifs } = usePassifs();

  // Construire le graphe familial simplifié
  const familyGraph: FamilyGraph | null = useMemo(() => {
    if (!familyMembers || !familyProfile) return null;

    const userId = 'user'; // ID du défunt (utilisateur)
    
    // Le conjoint est dans maritalStatus, pas dans familyMembers
    const hasConjoint = maritalStatus?.statut_couple === 'Marié(e)' || maritalStatus?.statut_couple === 'Pacsé(e)';
    const conjointId = hasConjoint ? 'conjoint' : undefined;
    
    // Chercher les enfants (attention à la casse : "Enfant" avec majuscule)
    const enfants = familyMembers.filter(m => 
      m.lien_familial === 'Enfant' || m.lien_familial === 'enfant'
    );

    const persons = [
      {
        id: userId,
        nom: familyProfile.nom || 'Utilisateur',
        prenom: familyProfile.prenom || '',
        estDecede: true
      },
      ...familyMembers.map(m => ({
        id: m.id!,
        nom: m.nom,
        prenom: m.prenom || '',
        estDecede: m.est_decede || false,
        handicap: m.handicap || false,
        lienFamilial: m.lien_familial
      }))
    ];

    // Ajouter le conjoint s'il existe
    if (hasConjoint && maritalStatus) {
      persons.push({
        id: conjointId!,
        nom: maritalStatus.nom_conjoint || '',
        prenom: maritalStatus.prenom_conjoint || '',
        estDecede: false,
        lienFamilial: 'conjoint'
      });
    }

    return {
      persons,
      links: [],
      marriages: hasConjoint && conjointId ? [{
        spouseA: userId,
        spouseB: conjointId,
        regime: maritalStatus?.regime_matrimonial || 'communauté'
      }] : [],
      decedentId: userId,
      hasSurvivingSpouse: hasConjoint,
      survivingSpouseId: hasConjoint ? conjointId : undefined,
      childrenOfDecedent: enfants.map(e => e.id!),
      childrenCommonWithSpouse: enfants.filter(e => 
        e.parent_de === 'both_parents' || !e.branche_familiale || e.branche_familiale === 'commune'
      ).map(e => e.id!)
    };
  }, [familyMembers, familyProfile, maritalStatus]);

  // Calculer le patrimoine
  const patrimony: PatrimonySnapshot = useMemo(() => {
    const totalActifs = assets.reduce((sum, a) => sum + (a.valeur_estimee || 0), 0);
    const totalPassifs = passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0);
    
    return {
      date: new Date().toISOString(),
      biensExistants: totalActifs,
      passifs: totalPassifs,
      assuranceVieTotal: 0 // À calculer selon les contrats AV
    };
  }, [assets, passifs]);

  // Convertir les libéralités
  const transmissionLiberalites: Liberalite[] = useMemo(() => {
    return liberalites.map(lib => ({
      id: lib.id!,
      type: lib.type === 'donation' ? 'donation' : 'legs',
      beneficiaireId: lib.beneficiaire,
      valeur: lib.montant || 0,
      date: lib.date_acte || new Date().toISOString(),
      rapportable: true,
      horsPart: false,
      beneficiaireName: lib.beneficiaire
    }));
  }, [liberalites]);

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

  // Calcul de transmission
  const transmissionResult = useMemo(() => {
    if (!familyGraph) return null;

    const ctx: TransmissionContext = {
      family: familyGraph,
      patrimony,
      liberalites: transmissionLiberalites,
      params,
      conjointOption: 'quartPP'
    };

    try {
      return computeTransmission(ctx);
    } catch (error) {
      console.error('Erreur calcul transmission:', error);
      return null;
    }
  }, [familyGraph, patrimony, transmissionLiberalites]);

  if (assetsLoading || familyLoading || liberalitesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processus de calcul de transmission</CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!familyGraph || !transmissionResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processus de calcul de transmission</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Veuillez d'abord renseigner votre situation familiale et votre patrimoine pour visualiser le processus de calcul.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const nbEnfants = familyGraph.childrenOfDecedent.filter(childId => 
    !familyGraph.persons.find(p => p.id === childId)?.estDecede
  ).length;
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
        `= Masse de calcul : ${transmissionResult.masseCalcul.toLocaleString('fr-FR')} €`
      ],
      formula: `${transmissionResult.masseCalcul.toLocaleString('fr-FR')} € = ${patrimony.biensExistants.toLocaleString('fr-FR')} - ${patrimony.passifs.toLocaleString('fr-FR')} + ${transmissionLiberalites.reduce((s, l) => s + l.valeur, 0).toLocaleString('fr-FR')}`,
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
        `Total droits de succession : ${transmissionResult.totalDroitsSuccession.toLocaleString('fr-FR')} €`,
        `Prélèvement 990 I (AV) : ${transmissionResult.total990I.toLocaleString('fr-FR')} €`,
        `Frais de notaire : ${transmissionResult.fraisNotaire.toLocaleString('fr-FR')} €`,
        `= Coût fiscal total : ${(transmissionResult.totalDroitsSuccession + transmissionResult.total990I + transmissionResult.fraisNotaire).toLocaleString('fr-FR')} €`,
        "",
        "Détail par héritier :",
        ...transmissionResult.heirs.map(h => 
          `• ${h.nom} : ${h.droitsSuccession.toLocaleString('fr-FR')} € (sur ${h.baseFiscale.toLocaleString('fr-FR')} €)`
        )
      ],
      formula: `Taux effectif = ${((transmissionResult.totalDroitsSuccession / patrimony.biensExistants) * 100).toFixed(1)}%`,
      conseils: [
        hasConjoint ? "✓ Le conjoint est totalement exonéré de droits de succession" : null,
        `Abattement de 100 000 € par enfant renouvelable tous les 15 ans`,
        transmissionResult.totalDroitsSuccession > 50000 ? "⚠️ Coût fiscal élevé : étudiez les stratégies d'optimisation (donations, démembrement, etc.)" : null,
        "L'assurance-vie bénéficie d'un régime fiscal très favorable (152 500 € d'abattement par bénéficiaire)",
        `Transmission nette aux héritiers : ${transmissionResult.transmissionNette.toLocaleString('fr-FR')} €`
      ].filter(Boolean)
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Processus de calcul de transmission
          </CardTitle>
          <CardDescription>
            Méthodologie complète de calcul de la transmission successorale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {calculSteps.map((step, index) => (
            <div key={index} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne gauche : Calcul détaillé */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium">Détails du calcul :</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="pl-4">
                          {detail.startsWith('•') || detail.startsWith('✓') || detail.startsWith('⚠️') ? detail : `• ${detail}`}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-mono text-foreground">{step.formula}</p>
                  </div>
                </div>

                {/* Colonne droite : Conseils */}
                <div className="lg:col-span-1">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3 h-full">
                    <div className="flex items-center gap-2 text-primary">
                      <Lightbulb className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Conseils pratiques</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {step.conseils.map((conseil, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">→</span>
                          <span>{conseil}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {index < calculSteps.length - 1 && (
                <Separator className="my-6" />
              )}
            </div>
          ))}

          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Synthèse du processus
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
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