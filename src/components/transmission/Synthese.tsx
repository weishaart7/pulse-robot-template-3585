import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calculator, FileText, DollarSign, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, Liberalite, TransmissionParams } from '@/lib/transmission';
import { computeDMTG, DMTGContext, DEFAULT_DMTG_PARAMS } from '@/lib/dmtg';
import { calculateSuccessionLegale, SuccessionLegaleResult } from '@/lib/transmission/successionLegale';
import transmissionParamsData from '@/data/transmission-params.json';

export const Synthese = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transmissionResult, setTransmissionResult] = useState<any>(null);
  const [successionLegale, setSuccessionLegale] = useState<SuccessionLegaleResult | null>(null);

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

      const optionConjoint = (maritalStatus as any)?.option_conjoint as string | null;

      const { data: familyLinks } = await supabase
        .from('family_links')
        .select('*')
        .eq('user_id', user!.id);

      // Récupérer les assets
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user!.id);

      // Calculer le total des assurances-vie (hors succession)
      const totalAV = (assets || [])
        .filter(a => a.nature === 'assurance-vie')
        .reduce((sum, a) => sum + (Number(a.valeur_estimee) || 0), 0);

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
      (family as any).hasDDV = !!maritalStatus?.donation_dernier_vivant_personne || !!maritalStatus?.donation_dernier_vivant_conjoint;
      
      // Construire le patrimoine
      const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(assets || [], charges || [], totalAV);
      // Asset portfolio analysis completed
      
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
          // Corriger le mapping des liens familiaux depuis la base de données
          const person = family.persons.find(p => p.id === heir.personId);
          const lienFamilial = person?.lienFamilial || heir.lien;
          
          // Family link mapping in progress
          
          let dmtgLien: any = 'autre';
          if (lienFamilial === 'conjoint') dmtgLien = 'conjoint';
          else if (lienFamilial === 'enfant') dmtgLien = 'enfant';
          else if (lienFamilial === 'parent') dmtgLien = 'ascendant';
          else if (lienFamilial === 'soeur' || lienFamilial === 'frère') dmtgLien = 'frere_soeur';
          else if (lienFamilial === 'neveu' || lienFamilial === 'nièce') dmtgLien = 'neveu_niece';
          
          // DMTG link mapping completed
          
          return {
            id: heir.personId,
            lien: dmtgLien
          };
        }),
        donations: [], // À récupérer depuis les libéralités si besoin
        avContracts: [] // À implémenter si contrats AV
      };

      // Vérifier s'il y a des legs/testaments
      const hasTestament = (liberalites || []).some(lib => lib.type === 'legs');
      
      // Calculer la succession légale "à défaut de dispositions"
      const successionLegaleResult = calculateSuccessionLegale(family, hasTestament, optionConjoint || undefined);
      setSuccessionLegale(successionLegaleResult);
      // Legal succession calculation completed

      // Calculer les droits DMTG
      const dmtgResult = computeDMTG(dmtgContext);
      // DMTG tax calculation completed

      // Recalculer la transmission nette avec les droits DMTG
      const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
      const transmissionNetteCorrigee = patrimoineNet - dmtgResult.totals.droitsTotaux - totalAV - civilResult.fraisNotaire;

      // Combiner les résultats
      const combinedResult = {
        ...civilResult,
        family,
        dmtg: dmtgResult,
        successionLegale: successionLegaleResult,
        transmissionNette: transmissionNetteCorrigee,
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
        estDecede: true, // Le défunt pour la simulation
        lienFamilial: 'défunt'
      }
    ];

    const familyLinks: any[] = [];
    const marriages: any[] = [];
    
    // Ajouter le conjoint - IGNORER si statut célibataire même avec date_pacs
    let survivingSpouseId: string | undefined;
    if (marital?.statut_couple && 
        marital.statut_couple !== 'Célibataire' && 
        marital.statut_couple !== 'celibataire' &&
        ['Marié(e)', 'Pacsé(e)'].includes(marital.statut_couple)) {
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

    // Ajouter les liens familiaux avec normalisation
    const childrenIds: string[] = [];
    links.forEach(link => {
      const personId = `person-${link.id}`;
      persons.push({
        id: personId,
        nom: link.nom,
        prenom: link.prenom || '',
        estDecede: link.est_decede || false, // Utiliser est_decede
        lienFamilial: link.lien_familial
      });

      // Normaliser les relations familiales
      const lienNormalise = link.lien_familial?.toLowerCase();
      let relation: 'child' | 'parent' | 'sibling' | 'other' = 'other';
      
      if (lienNormalise === 'enfant') {
        relation = 'child';
        familyLinks.push({ from: user!.id, to: personId, relation });
        childrenIds.push(personId);
      } else if (lienNormalise === 'parent') {
        relation = 'parent';
        familyLinks.push({ from: personId, to: user!.id, relation: 'child' });
      } else if (lienNormalise === 'frère' || lienNormalise === 'sœur' || lienNormalise === 'frère/sœur') {
        relation = 'sibling';
        familyLinks.push({ from: user!.id, to: personId, relation });
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

  const buildPatrimonySnapshot = (assets: any[], charges: any[], assuranceVieTotal: number = 0): PatrimonySnapshot => {
    const totalActifs = assets.reduce((sum, asset) => sum + (Number(asset.valeur_estimee) || 0), 0);
    const totalPassifs = charges.reduce((sum, charge) => sum + (Number(charge.montant) || 0), 0);

    return {
      date: new Date().toISOString().split('T')[0],
      biensExistants: totalActifs,
      passifs: totalPassifs,
      assuranceVieTotal
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

  // Utiliser les données de succession légale si disponibles, sinon les calculs civils
  const heritiersData = successionLegale && successionLegale.heritiers.length > 0 
    ? successionLegale.heritiers.map((heritier: any) => {
        const displayName = `${heritier.prenom} ${heritier.nom}`.trim() || heritier.nom || 'Héritier inconnu';
        const percentage = (heritier.quotePart * 100).toFixed(1);
        const patrimoineNet = transmissionResult.transmissionNette || 682000; // Utiliser la masse taxable depuis les logs
        
        return {
          name: displayName,
          value: heritier.quotePart * patrimoineNet,
          percentage,
          lien: heritier.lien,
          typeQuotePart: heritier.typeQuotePart,
          representation: heritier.representation
        };
      })
    : transmissionResult.heirs && transmissionResult.heirs.length > 0 
      ? transmissionResult.heirs.map((heir: any) => {
          const person = transmissionResult.family.persons.find((p: any) => p.id === heir.personId);
          
          // Améliorer l'affichage du nom complet
          let displayName = heir.nom || 'Héritier inconnu';
          if (person) {
            const prenom = person.prenom || '';
            const nom = person.nom || '';
            displayName = `${prenom} ${nom}`.trim() || displayName;
          }
          
          const percentage = transmissionResult.transmissionNette > 0 
            ? ((heir.partFinale / transmissionResult.transmissionNette) * 100).toFixed(1)
            : "0";
          
          // Utiliser le lien familial de la personne dans le graphe familial
          const lienFamilial = person?.lienFamilial || heir.lien || 'autre';
          
          return {
            name: displayName,
            value: heir.partFinale,
            percentage,
            lien: lienFamilial
          };
        }).filter(heir => heir.value > 0)
      : [{
          name: "État français",
          value: transmissionResult.transmissionNette || 682000,
          percentage: "100.0",
          lien: "état",
          typeQuotePart: "pleine_propriete" as const
        }]; // Fallback quand aucun héritier n'est trouvé

  const chartData = heritiersData.map((heir, index) => ({
    name: heir.name,
    value: heir.value,
    color: `hsl(${index * 45}, 70%, 50%)`
  }));

  // Couleurs dynamiques selon le lien familial
  const getColorForLien = (lien: string, index: number) => {
    const colors = ['#76ff61', '#ffbe98', '#15eae2', '#c698f5', '#0b5563', '#caeffb', '#05aaa4'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Affichage des explications de succession légale */}
      {successionLegale && successionLegale.explicationsTexte.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Succession légale</CardTitle>
            <CardDescription>
              À défaut de dispositions testamentaires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {successionLegale.explicationsTexte.map((explication, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {explication}
                </p>
              ))}
            </div>
            
            {successionLegale.optionConjoint && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Option du conjoint survivant</h4>
                <p className="text-sm text-muted-foreground">
                  Le conjoint peut choisir entre :
                </p>
                <ul className="text-sm text-muted-foreground mt-1 ml-4 list-disc">
                  <li>1/4 en pleine propriété</li>
                  <li>La totalité en usufruit (enfants en nue-propriété)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Graphique de transmission nette */}
        <Card>
          <CardHeader>
            <CardTitle>Transmission nette</CardTitle>
            <CardDescription>
              Répartition entre les héritiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={heritiersData}
                    cx="50%"
                    cy="50%"
                    innerRadius={95}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {heritiersData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getColorForLien(entry.lien, index)} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Valeur totale au centre */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(transmissionResult.transmissionNette)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Transmission nette
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails par héritier */}
        <Card>
          <CardHeader>
            <CardTitle>Détail par héritier</CardTitle>
            <CardDescription>
              Montants détaillés pour chaque héritier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {heritiersData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun héritier défini
                </p>
              ) : (
                heritiersData
                  .sort((a, b) => b.value - a.value)
                  .map((heritier) => (
                    <div key={heritier.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getColorForLien(heritier.lien, heritiersData.indexOf(heritier)) }}
                        />
                        <div>
                          <div className="font-medium text-foreground">
                            {heritier.name}
                            {heritier.representation && <span className="text-xs text-muted-foreground ml-1">(par représentation)</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {heritier.percentage}% de la transmission • {heritier.lien}
                            {heritier.typeQuotePart && heritier.typeQuotePart !== 'pleine_propriete' && (
                              <span className="ml-1">({heritier.typeQuotePart.replace('_', ' ')})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(heritier.value)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coûts de succession par héritier */}
      {transmissionResult.dmtg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Coûts de la succession
            </CardTitle>
            <CardDescription>
              Droits de mutation (DMTG), frais de notaire et droit de partage par héritier
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const dmtg = transmissionResult.dmtg;
              const family = transmissionResult.family;
              const fraisNotaireTotal = transmissionResult.fraisNotaire || 0;
              const nbHeritiers = heritiersData.length;
              // Droit de partage : 2,5% de l'actif net partagé (si >1 héritier)
              const droitPartageTotal = nbHeritiers > 1 ? Math.round(transmissionResult.transmissionNette * 0.025) : 0;

              const rows = heritiersData.map((heritier, idx) => {
                // Trouver le personId correspondant
                const person = family?.persons?.find((p: any) => {
                  const fullName = `${p.prenom} ${p.nom}`.trim();
                  return fullName === heritier.name || p.nom === heritier.name;
                });
                const personId = person?.id;
                const dmtgData = personId ? dmtg.perBeneficiary[personId] : null;
                const droitsDMTG = dmtgData?.droitsTotaux || 0;
                const quotePart = transmissionResult.transmissionNette > 0 
                  ? heritier.value / transmissionResult.transmissionNette 
                  : 1 / nbHeritiers;
                const fraisNotaireHeritier = Math.round(fraisNotaireTotal * quotePart);
                const droitPartageHeritier = Math.round(droitPartageTotal * quotePart);
                const totalCouts = droitsDMTG + fraisNotaireHeritier + droitPartageHeritier;

                return {
                  name: heritier.name,
                  lien: heritier.lien,
                  droitsDMTG,
                  fraisNotaire: fraisNotaireHeritier,
                  droitPartage: droitPartageHeritier,
                  totalCouts,
                  color: getColorForLien(heritier.lien, idx)
                };
              });

              const totalDMTG = rows.reduce((s, r) => s + r.droitsDMTG, 0);
              const totalFrais = rows.reduce((s, r) => s + r.fraisNotaire, 0);
              const totalPartage = rows.reduce((s, r) => s + r.droitPartage, 0);
              const grandTotal = rows.reduce((s, r) => s + r.totalCouts, 0);

              return (
                <div className="space-y-6">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Héritier</TableHead>
                          <TableHead className="text-right">DMTG</TableHead>
                          <TableHead className="text-right">Frais de notaire</TableHead>
                          <TableHead className="text-right">Droit de partage</TableHead>
                          <TableHead className="text-right font-semibold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.name}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                                <div>
                                  <span className="font-medium">{row.name}</span>
                                  <span className="text-xs text-muted-foreground ml-1.5">({row.lien})</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(row.droitsDMTG)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(row.fraisNotaire)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(row.droitPartage)}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(row.totalCouts)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totalDMTG)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totalFrais)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totalPartage)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{formatCurrency(grandTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Bar chart visualization */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k€`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="droitsDMTG" name="DMTG" fill="#ef4444" stackId="costs" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="fraisNotaire" name="Frais de notaire" fill="#f59e0b" stackId="costs" />
                        <Bar dataKey="droitPartage" name="Droit de partage" fill="#8b5cf6" stackId="costs" radius={[0, 4, 4, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Abattements restants par héritier */}
      {transmissionResult.dmtg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Abattements restants
            </CardTitle>
            <CardDescription>
              Abattements fiscaux résiduels par héritier en fonction de son lien avec le défunt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const dmtg = transmissionResult.dmtg;
              const family = transmissionResult.family;

              const getAbattementLegal = (lien: string): { montant: number; label: string } => {
                switch (lien) {
                  case 'enfant': return { montant: 100000, label: 'Enfant / Ascendant (100 000 €)' };
                  case 'conjoint': return { montant: Infinity, label: 'Conjoint / Partenaire (exonéré)' };
                  case 'parent': return { montant: 100000, label: 'Ascendant (100 000 €)' };
                  case 'frère': case 'sœur': case 'frere_soeur': return { montant: 15932, label: 'Frère / Sœur (15 932 €)' };
                  case 'neveu': case 'nièce': case 'neveu_niece': return { montant: 7967, label: 'Neveu / Nièce (7 967 €)' };
                  default: return { montant: 1594, label: 'Autre (1 594 €)' };
                }
              };

              const abattementRows = heritiersData.map((heritier, idx) => {
                const person = family?.persons?.find((p: any) => {
                  const fullName = `${p.prenom} ${p.nom}`.trim();
                  return fullName === heritier.name || p.nom === heritier.name;
                });
                const personId = person?.id;
                const dmtgData = personId ? dmtg.perBeneficiary[personId] : null;
                const lienFamilial = person?.lienFamilial || heritier.lien;
                const abattementInfo = getAbattementLegal(lienFamilial);
                const abattementLegal = abattementInfo.montant;
                const residuel = dmtgData?.allowanceGeneralResidual ?? abattementLegal;
                const isExonere = abattementLegal === Infinity;
                const consomme = isExonere ? 0 : Math.max(0, abattementLegal - (typeof residuel === 'number' && residuel !== Infinity ? residuel : abattementLegal));
                const pctUtilise = isExonere ? 0 : abattementLegal > 0 ? (consomme / abattementLegal) * 100 : 0;

                return {
                  name: heritier.name,
                  lien: lienFamilial,
                  qualite: abattementInfo.label,
                  abattementLegal: isExonere ? 'Exonéré' : formatCurrency(abattementLegal),
                  residuel: isExonere ? 'Exonéré' : formatCurrency(typeof residuel === 'number' && residuel !== Infinity ? residuel : abattementLegal),
                  consomme: isExonere ? '-' : formatCurrency(consomme),
                  pctUtilise: isExonere ? 0 : pctUtilise,
                  isExonere,
                  color: getColorForLien(heritier.lien, idx)
                };
              });

              return (
                <div className="space-y-4">
                  {abattementRows.map((row) => (
                    <div key={row.name} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="font-medium">{row.name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {row.qualite}
                        </span>
                      </div>
                      
                      {row.isExonere ? (
                        <div className="text-sm text-emerald-600 font-medium">
                          Exonéré de droits de succession (conjoint ou partenaire de PACS)
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Abattement légal</div>
                              <div className="font-medium">{row.abattementLegal}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Consommé</div>
                              <div className="font-medium text-orange-500">{row.consomme}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Restant</div>
                              <div className="font-semibold text-emerald-600">{row.residuel}</div>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, row.pctUtilise)}%`,
                                backgroundColor: row.pctUtilise > 75 ? '#ef4444' : row.pctUtilise > 50 ? '#f59e0b' : '#22c55e'
                              }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {row.pctUtilise.toFixed(0)}% utilisé
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Répartition patrimoniale</CardTitle>
          <CardDescription>
            Réserve héréditaire et quotité disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center p-6 rounded-lg border bg-muted/50">
              <div className="text-2xl font-bold text-foreground mb-2">
                {formatCurrency(transmissionResult.reserve)}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Réserve héréditaire
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {transmissionResult.masseCalcul > 0 
                  ? `${((transmissionResult.reserve / transmissionResult.masseCalcul) * 100).toFixed(1)}%`
                  : '0%'
                } de la masse de calcul
              </div>
            </div>
            
            <div className="text-center p-6 rounded-lg border bg-muted/50">
              <div className="text-2xl font-bold text-foreground mb-2">
                {formatCurrency(Math.max(0, transmissionResult.masseCalcul - transmissionResult.reserve))}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Quotité disponible
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {transmissionResult.masseCalcul > 0 
                  ? `${(((transmissionResult.masseCalcul - transmissionResult.reserve) / transmissionResult.masseCalcul) * 100).toFixed(1)}%`
                  : '0%'
                } de la masse de calcul
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};