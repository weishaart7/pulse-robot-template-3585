import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calculator, FileText, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePassifs } from '@/hooks/usePassifs';
import { buildFamilyGraph, buildPatrimonySnapshot } from '@/utils/transmissionHelpers';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, Liberalite, TransmissionParams } from '@/lib/transmission';
import { computeDMTG, DMTGContext, DEFAULT_DMTG_PARAMS } from '@/lib/dmtg';
import transmissionParamsData from '@/data/transmission-params.json';
import './kairos-transmission.css';

const TYPE_QUOTE_PART_LABELS: Record<string, string> = {
  pleine_propriete: 'pleine propriété',
  usufruit: 'usufruit',
  nue_propriete: 'nue-propriété'
};

export const Synthese = () => {
  const { user } = useAuth();
  const { passifs, loading: passifsLoading } = usePassifs();
  const [loading, setLoading] = useState(true);
  const [transmissionResult, setTransmissionResult] = useState<any>(null);
  const [hasAssets, setHasAssets] = useState(false);

  useEffect(() => {
    if (user && !passifsLoading) {
      fetchTransmissionData();
    }
  }, [user, passifsLoading, passifs]);

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

      setHasAssets((assets || []).length > 0);

      // Calculer le total des assurances-vie (hors succession)
      const totalAV = (assets || [])
        .filter(a => a.nature === 'assurance-vie')
        .reduce((sum, a) => sum + (Number(a.valeur_estimee) || 0), 0);

      // Récupérer les libéralités
      const { data: liberalites } = await supabase
        .from('liberalites')
        .select('*')
        .eq('user_id', user!.id);

      // Construire le graphe familial
      const family: FamilyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks || []);

      // Construire le patrimoine
      const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(assets || [], passifs, totalAV);
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
        params,
        conjointOption: (optionConjoint as any) || undefined
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

          const lienNormalise = lienFamilial?.toLowerCase();
          let dmtgLien: any = 'autre';
          if (lienNormalise === 'conjoint') dmtgLien = 'conjoint';
          else if (lienNormalise === 'enfant') dmtgLien = 'enfant';
          else if (lienNormalise === 'parent') dmtgLien = 'ascendant';
          else if (lienNormalise === 'frère/sœur') dmtgLien = 'frere_soeur';
          else if (lienNormalise === 'neveu/nièce') dmtgLien = 'neveu_niece';

          // DMTG link mapping completed

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
      // DMTG tax calculation completed

      // Recalculer la transmission nette avec les droits DMTG
      const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
      const transmissionNetteCorrigee = patrimoineNet - dmtgResult.totals.droitsTotaux - totalAV - civilResult.fraisNotaire;

      // Combiner les résultats
      const combinedResult = {
        ...civilResult,
        family,
        dmtg: dmtgResult,
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
      <div className="kairos-transmission flex justify-center items-center h-64">
        <div className="text-lg text-[var(--text-secondary)]">Calcul en cours...</div>
      </div>
    );
  }

  if (!transmissionResult) {
    return (
      <div className="kairos-transmission text-center py-12">
        <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Données insuffisantes</h3>
        <p className="text-[var(--text-secondary)]">
          Veuillez renseigner vos données dans les sections Famille et Patrimoine.
        </p>
      </div>
    );
  }

  const transmissionIncomplete = !transmissionResult.transmissionNette && hasAssets;

  // Source unique : transmissionResult.heirs (issu de computeTransmission, dévolution unifiée).
  // Un même héritier peut porter plusieurs parts (ex: conjoint 1/4 PP + usufruit 3/4) :
  // on les regroupe en une seule ligne pour l'affichage synthétique, en gardant le détail des types.
  const heritiersData = (() => {
    const heirsSource: any[] = transmissionResult.heirs || [];

    if (heirsSource.length === 0) {
      return [{
        name: "État français",
        value: transmissionResult.transmissionNette || 0,
        percentage: "100.0",
        lien: "état",
        typeQuotePart: "pleine_propriete" as const
      }];
    }

    const grouped = new Map<string, {
      name: string;
      lien: string;
      value: number;
      representation?: boolean;
      parts: { value: number; typeQuotePart?: string }[];
    }>();

    heirsSource.forEach((heir: any) => {
      const person = transmissionResult.family.persons.find((p: any) => p.id === heir.personId);
      let displayName = heir.nom || 'Héritier inconnu';
      if (person) {
        const prenom = person.prenom || '';
        const nom = person.nom || '';
        displayName = `${prenom} ${nom}`.trim() || displayName;
      }
      const lienFamilial = person?.lienFamilial || heir.lien || 'autre';

      const existing = grouped.get(heir.personId);
      if (existing) {
        existing.value += heir.partFinale;
        existing.parts.push({ value: heir.partFinale, typeQuotePart: heir.typeQuotePart });
      } else {
        grouped.set(heir.personId, {
          name: displayName,
          lien: lienFamilial,
          value: heir.partFinale,
          representation: heir.representation,
          parts: [{ value: heir.partFinale, typeQuotePart: heir.typeQuotePart }]
        });
      }
    });

    return Array.from(grouped.values())
      .filter(h => h.value > 0)
      .map(h => {
        const percentage = transmissionResult.transmissionNette > 0
          ? ((h.value / transmissionResult.transmissionNette) * 100).toFixed(1)
          : "0";

        const uniqueTypes = Array.from(new Set(h.parts.map(p => p.typeQuotePart).filter(Boolean)));
        const typeQuotePart = uniqueTypes.length === 1 ? uniqueTypes[0] : undefined;
        const droitsDetail = uniqueTypes.length > 1
          ? h.parts
              .filter(p => p.typeQuotePart)
              .map(p => `${((p.value / h.value) * 100).toFixed(0)}% en ${TYPE_QUOTE_PART_LABELS[p.typeQuotePart!] || p.typeQuotePart}`)
              .join(' + ')
          : undefined;

        return {
          name: h.name,
          value: h.value,
          percentage,
          lien: h.lien,
          typeQuotePart,
          droitsDetail,
          representation: h.representation
        };
      });
  })();

  const chartData = heritiersData.map((heir, index) => ({
    name: heir.name,
    value: heir.value,
    color: `hsl(${index * 45}, 70%, 50%)`
  }));

  // Couleurs dynamiques selon le lien familial (palette data-visualisation Kairos)
  const getColorForLien = (lien: string, index: number) => {
    const colors = [
      'var(--data-green)',
      'var(--data-blue)',
      'var(--data-teal)',
      'var(--data-purple)',
      'var(--data-magenta)',
      'var(--data-amber)',
      'var(--ink-400)'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="kairos-transmission space-y-6">
      {transmissionIncomplete && (
        <Alert variant="destructive" className="bg-[var(--negative-soft)] border-[var(--negative)]/30 text-[var(--negative)]">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Le calcul de transmission n'a pas pu aboutir. Vérifiez que votre situation familiale est complète.
          </AlertDescription>
        </Alert>
      )}
      {/* Affichage des explications de succession légale */}
      {transmissionResult.explicationsTexte && transmissionResult.explicationsTexte.length > 0 && (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Succession légale</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              À défaut de dispositions testamentaires
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="space-y-2">
              {transmissionResult.explicationsTexte.map((explication, index) => (
                <p key={index} className="text-sm text-[var(--text-secondary)]">
                  {explication}
                </p>
              ))}
            </div>

            {transmissionResult.optionConjoint && (
              <div className="mt-4 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)]">
                <h4 className="font-medium mb-2 text-[var(--text-primary)]">Option du conjoint survivant</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Le conjoint peut choisir entre :
                </p>
                <ul className="text-sm text-[var(--text-secondary)] mt-1 ml-4 list-disc">
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
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Transmission nette</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Répartition entre les héritiers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
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
                    stroke="var(--surface)"
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
                  <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {formatCurrency(transmissionResult.transmissionNette)}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Transmission nette
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails par héritier */}
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Détail par héritier</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Montants détaillés pour chaque héritier
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="space-y-4">
              {heritiersData.length === 0 ? (
                <p className="text-[var(--text-secondary)] text-center py-8">
                  Aucun héritier défini
                </p>
              ) : (
                heritiersData
                  .sort((a, b) => b.value - a.value)
                  .map((heritier) => (
                    <div key={heritier.name} className="flex items-center justify-between p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getColorForLien(heritier.lien, heritiersData.indexOf(heritier)) }}
                        />
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">
                            {heritier.name}
                            {heritier.representation && <span className="text-xs text-[var(--text-secondary)] ml-1">(par représentation)</span>}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            {heritier.percentage}% de la transmission • {heritier.lien}
                            {heritier.droitsDetail ? (
                              <span className="ml-1">({heritier.droitsDetail})</span>
                            ) : heritier.typeQuotePart && heritier.typeQuotePart !== 'pleine_propriete' && (
                              <span className="ml-1">({TYPE_QUOTE_PART_LABELS[heritier.typeQuotePart] || heritier.typeQuotePart})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="kairos-num font-semibold text-[var(--text-primary)]">
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
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
              <Calculator className="h-5 w-5 text-[var(--ink-400)]" />
              Coûts de la succession
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Droits de mutation (DMTG), frais de notaire et droit de partage par héritier
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
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
                        <TableRow className="border-[var(--border)]">
                          <TableHead className="text-[var(--text-secondary)]">Héritier</TableHead>
                          <TableHead className="text-right text-[var(--text-secondary)]">DMTG</TableHead>
                          <TableHead className="text-right text-[var(--text-secondary)]">Frais de notaire</TableHead>
                          <TableHead className="text-right text-[var(--text-secondary)]">Droit de partage</TableHead>
                          <TableHead className="text-right font-semibold text-[var(--text-secondary)]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.name} className="border-[var(--border)]">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                                <div>
                                  <span className="font-medium text-[var(--text-primary)]">{row.name}</span>
                                  <span className="text-xs text-[var(--text-secondary)] ml-1.5">({row.lien})</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(row.droitsDMTG)}</TableCell>
                            <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(row.fraisNotaire)}</TableCell>
                            <TableCell className="kairos-num text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(row.droitPartage)}</TableCell>
                            <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(row.totalCouts)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-[var(--border-strong)]">
                          <TableCell className="font-semibold text-[var(--text-primary)]">Total</TableCell>
                          <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(totalDMTG)}</TableCell>
                          <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(totalFrais)}</TableCell>
                          <TableCell className="kairos-num text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(totalPartage)}</TableCell>
                          <TableCell className="kairos-num text-right tabular-nums font-bold text-[var(--text-primary)]">{formatCurrency(grandTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Bar chart visualization */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k€`} stroke="var(--ink-500)" fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} stroke="var(--ink-500)" fontSize={12} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="droitsDMTG" name="DMTG" fill="var(--negative)" stackId="costs" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="fraisNotaire" name="Frais de notaire" fill="var(--warning)" stackId="costs" />
                        <Bar dataKey="droitPartage" name="Droit de partage" fill="var(--data-purple)" stackId="costs" radius={[0, 4, 4, 0]} />
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
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="p-5">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
              <Shield className="h-5 w-5 text-[var(--ink-400)]" />
              Abattements restants
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Abattements fiscaux résiduels par héritier en fonction de son lien avec le défunt
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
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
                    <div key={row.name} className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="font-medium text-[var(--text-primary)]">{row.name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--ink-050)] text-[var(--ink-700)]">
                          {row.qualite}
                        </span>
                      </div>

                      {row.isExonere ? (
                        <div className="text-sm text-[var(--positive)] font-medium">
                          Exonéré de droits de succession (conjoint ou partenaire de PACS)
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-[var(--text-secondary)]">Abattement légal</div>
                              <div className="kairos-num font-medium text-[var(--text-primary)]">{row.abattementLegal}</div>
                            </div>
                            <div>
                              <div className="text-[var(--text-secondary)]">Consommé</div>
                              <div className="kairos-num font-medium text-[var(--warning)]">{row.consomme}</div>
                            </div>
                            <div>
                              <div className="text-[var(--text-secondary)]">Restant</div>
                              <div className="kairos-num font-semibold text-[var(--positive)]">{row.residuel}</div>
                            </div>
                          </div>
                          <div className="w-full bg-[var(--ink-050)] rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, row.pctUtilise)}%`,
                                backgroundColor: row.pctUtilise > 75 ? 'var(--negative)' : row.pctUtilise > 50 ? 'var(--warning)' : 'var(--positive)'
                              }}
                            />
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] text-right">
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
      <Card className="mt-6 bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Répartition patrimoniale</CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Réserve héréditaire et quotité disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(transmissionResult.reserve)}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                Réserve héréditaire
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {transmissionResult.masseCalcul > 0
                  ? `${((transmissionResult.reserve / transmissionResult.masseCalcul) * 100).toFixed(1)}%`
                  : '0%'
                } de la masse de calcul
              </div>
            </div>

            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(Math.max(0, transmissionResult.masseCalcul - transmissionResult.reserve))}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                Quotité disponible
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
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
