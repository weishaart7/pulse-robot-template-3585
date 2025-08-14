import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, Liberalite, TransmissionParams } from '@/lib/transmission';
import { computeDMTG, DMTGContext, DEFAULT_DMTG_PARAMS } from '@/lib/dmtg';
import transmissionParamsData from '@/data/transmission-params.json';

export const Synthese = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transmissionResult, setTransmissionResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchTransmissionData();
    }
  }, [user]);

  const fetchTransmissionData = async () => {
    try {
      setLoading(true);

      // Récupérer les données famille
      const { data: familyProfile } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      const { data: maritalStatus } = await supabase
        .from('marital_status')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      const { data: familyLinks } = await supabase
        .from('family_links')
        .select('*')
        .eq('user_id', user!.id);

      // Récupérer les assets
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user!.id);

      // Récupérer les passifs (charges)
      const { data: charges } = await supabase
        .from('charges')
        .select('*')
        .eq('user_id', user!.id);

      // Récupérer les libéralités
      const { data: liberalites } = await supabase
        .from('liberalites')
        .select('*')
        .eq('user_id', user!.id);

      // Construire le graphe familial
      const family: FamilyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks || []);
      
      // Construire le patrimoine
      const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(assets || [], charges || []);
      
      // Transformer les libéralités
      const liberalitesFormatted: Liberalite[] = (liberalites || []).map(lib => ({
        id: lib.id!,
        type: lib.type as 'donation' | 'legs',
        beneficiaireId: lib.beneficiaire || 'tiers',
        valeur: Number(lib.montant) || 0,
        date: lib.date_acte || new Date().toISOString().split('T')[0],
        denomination: lib.denomination,
        beneficiaireName: lib.beneficiaire
      }));

      // Paramètres fiscaux - conversion de type appropriée
      const params: TransmissionParams = {
        abattements: {
          ...transmissionParamsData.abattements,
          conjoint: transmissionParamsData.abattements.conjoint === "Infinity" ? Infinity : Number(transmissionParamsData.abattements.conjoint)
        },
        bareme: transmissionParamsData.bareme,
        prelevement990I: transmissionParamsData.prelevement990I,
        fraisNotaire: {
          mode: transmissionParamsData.fraisNotaire.mode as "pourcentage" | "forfait",
          valeur: transmissionParamsData.fraisNotaire.valeur
        }
      };

      // Calculer la transmission civile
      const civilResult = computeTransmission({
        family,
        patrimony,
        liberalites: liberalitesFormatted,
        params
      });

      // Préparer les données pour le calcul DMTG
      const dmtgContext: DMTGContext = {
        deathDate: new Date().toISOString().split('T')[0],
        params: DEFAULT_DMTG_PARAMS,
        regimeMatrimonial: {
          regime: maritalStatus?.contrat_mariage?.toLowerCase().includes('communauté') ? 'communauté' : 'séparation',
          actifCommun: 0,
          passifCommun: 0,
          avantagesMatrimoniaux: []
        },
        assets: (assets || []).map(asset => ({
          id: asset.id!,
          label: asset.denomination || '',
          valeurVenale: Number(asset.valeur_estimee) || 0,
          nature: 'autre',
          location: 'metropole',
          isResidencePrincipale: asset.nature === 'immobilier',
          exclurePour: {}
        })),
        civilShares: civilResult.heirs.map(heir => ({
          beneficiaryId: heir.personId,
          fraction: heir.partFinale / civilResult.transmissionNette,
          source: 'legal' as const
        })),
        beneficiaries: civilResult.heirs.map(heir => {
          // Corriger le mapping des liens familiaux
          const person = family.persons.find(p => p.id === heir.personId);
          const lienFamilial = person?.lienFamilial || heir.lien;
          
          let dmtgLien: any = 'autre';
          if (lienFamilial === 'conjoint') dmtgLien = 'conjoint';
          else if (lienFamilial === 'enfant') dmtgLien = 'enfant';
          else if (lienFamilial === 'parent') dmtgLien = 'ascendant';
          else if (lienFamilial === 'soeur' || lienFamilial === 'frère') dmtgLien = 'frere_soeur';
          else if (lienFamilial === 'neveu' || lienFamilial === 'nièce') dmtgLien = 'neveu_niece';
          
          return {
            id: heir.personId,
            lien: dmtgLien
          };
        }),
        donations: [], // À récupérer depuis les libéralités si besoin
        avContracts: [] // À implémenter si contrats AV
      };

      // Calculer les droits DMTG
      const dmtgResult = computeDMTG(dmtgContext);
      console.log('Résultat DMTG:', dmtgResult);

      // Combiner les résultats
      const combinedResult = {
        ...civilResult,
        family,
        dmtg: dmtgResult,
        // Mettre à jour les droits de succession avec les calculs DMTG
        heirs: civilResult.heirs.map(heir => ({
          ...heir,
          droitsSuccession: dmtgResult.perBeneficiary[heir.personId]?.droitsTotaux || 0
        })),
        totalDroitsSuccession: dmtgResult.totals.droitsTotaux
      };

      setTransmissionResult(combinedResult);
    } catch (error) {
      console.error('Erreur lors du calcul de transmission:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildFamilyGraph = (profile: any, marital: any, links: any[]): FamilyGraph => {
    const persons = [
      {
        id: user!.id,
        nom: profile?.nom || 'Utilisateur',
        prenom: profile?.prenom || '',
        estDecede: false,
        lienFamilial: 'défunt'
      }
    ];

    const familyLinks: any[] = [];
    const marriages: any[] = [];
    
    // Ajouter le conjoint si marié/pacsé
    let survivingSpouseId: string | undefined;
    if (marital?.statut_couple && ['Marié(e)', 'Pacsé(e)'].includes(marital.statut_couple)) {
      const conjointId = `conjoint-${user!.id}`;
      persons.push({
        id: conjointId,
        nom: marital.nom_conjoint || 'Conjoint',
        prenom: marital.prenom_conjoint || '',
        estDecede: false,
        lienFamilial: 'conjoint'
      });
      
      familyLinks.push({
        from: user!.id,
        to: conjointId,
        relation: 'spouse' as const
      });
      
      marriages.push({
        spouseA: user!.id,
        spouseB: conjointId
      });
      
      survivingSpouseId = conjointId;
    }

    // Ajouter les liens familiaux
    const childrenIds: string[] = [];
    links.forEach(link => {
      const personId = `person-${link.id}`;
      persons.push({
        id: personId,
        nom: link.nom,
        prenom: link.prenom || '',
        estDecede: false,
        lienFamilial: link.lien_familial
      });

      familyLinks.push({
        from: user!.id,
        to: personId,
        relation: link.lien_familial === 'enfant' ? 'child' as const : 'other' as const
      });

      if (link.lien_familial === 'enfant') {
        childrenIds.push(personId);
      }
    });

    return {
      persons,
      links: familyLinks,
      marriages,
      decedentId: user!.id,
      hasSurvivingSpouse: !!survivingSpouseId,
      survivingSpouseId,
      childrenOfDecedent: childrenIds,
      childrenCommonWithSpouse: childrenIds // Simplification
    };
  };

  const buildPatrimonySnapshot = (assets: any[], charges: any[]): PatrimonySnapshot => {
    const totalActifs = assets.reduce((sum, asset) => sum + (Number(asset.valeur_estimee) || 0), 0);
    const totalPassifs = charges.reduce((sum, charge) => sum + (Number(charge.montant) || 0), 0);

    return {
      date: new Date().toISOString().split('T')[0],
      biensExistants: totalActifs,
      passifs: totalPassifs
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Calcul en cours...</div>
      </div>
    );
  }

  if (!transmissionResult) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Données insuffisantes</h3>
        <p className="text-muted-foreground">
          Veuillez renseigner vos données dans les sections Famille et Patrimoine.
        </p>
      </div>
    );
  }

  const chartData = transmissionResult.heirs.map((heir: any, index: number) => ({
    name: heir.nom,
    value: heir.partFinale,
    color: `hsl(${index * 45}, 70%, 50%)`
  }));

  return (
    <div className="space-y-6">
      {/* Synthèse globale */}
      <Card>
        <CardHeader>
          <CardTitle>Synthèse de la transmission</CardTitle>
          <CardDescription>
            Vue d'ensemble des valeurs et droits de transmission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(transmissionResult.transmissionNette)}
              </div>
              <div className="text-sm text-muted-foreground">Transmission nette</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(transmissionResult.totalDroitsSuccession)}
              </div>
              <div className="text-sm text-muted-foreground">Droits de succession</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(transmissionResult.fraisNotaire)}
              </div>
              <div className="text-sm text-muted-foreground">Frais de notaire</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition par héritier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par héritier</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Héritier</TableHead>
                  <TableHead>Lien</TableHead>
                  <TableHead className="text-right">Part finale</TableHead>
                  <TableHead className="text-right">Droits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transmissionResult.heirs.map((heir: any) => (
                  <TableRow key={heir.personId}>
                    <TableCell className="font-medium">{heir.nom}</TableCell>
                    <TableCell>
                      {transmissionResult.family?.persons?.find(p => p.id === heir.personId)?.lienFamilial || heir.lien}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(heir.partFinale)}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(heir.droitsSuccession)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition graphique</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Détails fiscaux */}
      <Card>
        <CardHeader>
          <CardTitle>Détails des calculs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Masse de calcul</h4>
              <p>{formatCurrency(transmissionResult.masseCalcul)}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Réserve globale</h4>
              <p>{formatCurrency(transmissionResult.reserve)}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quotité disponible</h4>
              <p>{formatCurrency(transmissionResult.quotiteDisponible)}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Total 990 I</h4>
              <p>{formatCurrency(transmissionResult.total990I)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};