import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { Shield, FileText, AlertTriangle, ArrowRight, ChevronRight, Scale, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AVContractDetail } from './av/AVContractDetail';

const AV_NATURES = [
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
  "Bons & contrats de capitalisation",
];

interface OperationsByContract {
  [assetId: string]: { type_operation: string; montant: number }[];
}

interface Beneficiaire {
  nom: string;
  prenom: string | null;
  lien: string;
}

export const AssuranceVie = () => {
  const [contracts, setContracts] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Asset | null>(null);
  const [subscriberAge, setSubscriberAge] = useState<number | null>(null);
  const [isCouple, setIsCouple] = useState(false);
  const [operationsByContract, setOperationsByContract] = useState<OperationsByContract>({});
  const [nbBeneficiaires, setNbBeneficiaires] = useState(1);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [conjointName, setConjointName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contractsRes, profileRes, maritalRes, familyRes] = await Promise.all([
          supabase
            .from('assets')
            .select('*')
            .eq('user_id', user.id)
            .in('nature', AV_NATURES)
            .order('created_at', { ascending: false }),
          supabase
            .from('family_profiles')
            .select('date_naissance')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('marital_status')
            .select('statut_couple, nom_conjoint, prenom_conjoint')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('family_links')
            .select('nom, prenom, lien_familial')
            .eq('user_id', user.id),
        ]);

        const avContracts = contractsRes.data || [];
        setContracts(avContracts);

        if (profileRes.data?.date_naissance) {
          const birth = new Date(profileRes.data.date_naissance);
          const now = new Date();
          const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          setSubscriberAge(age);
        }
        const statut = maritalRes.data?.statut_couple || null;
        const coupleStatus = ['Marié(e)', 'Pacsé(e)'].includes(statut || '');
        setIsCouple(coupleStatus);

        const familyMembers = (familyRes.data || []).map((f: any) => ({
          nom: f.nom,
          prenom: f.prenom,
          lien: f.lien_familial,
        }));
        setBeneficiaires(familyMembers);
        setNbBeneficiaires(Math.max(1, familyMembers.length));

        // Get spouse name if couple
        if (coupleStatus && maritalRes.data) {
          const ms = maritalRes.data as any;
          if (ms.nom_conjoint || ms.prenom_conjoint) {
            setConjointName(`${ms.prenom_conjoint || ''} ${ms.nom_conjoint || ''}`.trim());
          }
        }

        // Fetch all operations for these contracts
        if (avContracts.length > 0) {
          const assetIds = avContracts.map(c => c.id);
          const { data: opsData } = await supabase
            .from('av_operations')
            .select('asset_id, type_operation, montant')
            .in('asset_id', assetIds);

          if (opsData) {
            const grouped: OperationsByContract = {};
            opsData.forEach((op: any) => {
              if (!grouped[op.asset_id]) grouped[op.asset_id] = [];
              grouped[op.asset_id].push({ type_operation: op.type_operation, montant: op.montant });
            });
            setOperationsByContract(grouped);
          }
        }
      } catch (error) {
        console.error('Error fetching AV contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute 990I / 757B totals and per-beneficiary breakdown
  const fiscalSummary = useMemo(() => {
    const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);

    const is990I = subscriberAge !== null && subscriberAge < 70;
    const montant990I = is990I ? totalValeur : 0;
    const montant757B = !is990I && subscriberAge !== null ? totalValeur : 0;

    // Count non-spouse beneficiaries for taxation (spouse is always exempt)
    const nonSpouseBeneficiaires = beneficiaires.filter(b => b.lien !== 'Conjoint');
    const nbTaxable = Math.max(1, nonSpouseBeneficiaires.length);

    // 990I: 152,500€ per taxable beneficiary
    const abattement990I = 152500 * nbTaxable;
    const assiette990I = Math.max(0, montant990I - abattement990I);
    const seuil700k = 700000;
    let droits990I = 0;
    if (assiette990I > 0) {
      const tranche1 = Math.min(assiette990I, seuil700k);
      const tranche2 = Math.max(0, assiette990I - seuil700k);
      droits990I = tranche1 * 0.20 + tranche2 * 0.3125;
    }

    // 757B: 30,500€ global abattement
    const abattement757B = 30500;
    const assiette757B = Math.max(0, montant757B - abattement757B);
    const droits757B = assiette757B * 0.20;

    const totalDroits = droits990I + droits757B;

    // Per-beneficiary breakdown (equal split assumed)
    const allBenefs = beneficiaires.length > 0 ? beneficiaires : [{ nom: 'Bénéficiaire', prenom: null, lien: 'Non renseigné' }];
    const capitalParBenef = totalValeur / Math.max(1, allBenefs.length);

    const beneficiaireDetails = allBenefs.map(b => {
      const isSpouse = b.lien === 'Conjoint';
      if (isSpouse) {
        return {
          ...b,
          capitalBrut: capitalParBenef,
          droits: 0,
          capitalNet: capitalParBenef,
          exonere: true,
        };
      }

      // Taxable beneficiary
      let droitsBenef = 0;
      if (is990I) {
        const assietteBenef = Math.max(0, capitalParBenef - 152500);
        const t1 = Math.min(assietteBenef, seuil700k);
        const t2 = Math.max(0, assietteBenef - seuil700k);
        droitsBenef = t1 * 0.20 + t2 * 0.3125;
      } else if (subscriberAge !== null) {
        // 757B: share of global abattement
        const abattShare = abattement757B / nbTaxable;
        const assietteBenef = Math.max(0, capitalParBenef - abattShare);
        droitsBenef = assietteBenef * 0.20;
      }

      return {
        ...b,
        capitalBrut: capitalParBenef,
        droits: droitsBenef,
        capitalNet: capitalParBenef - droitsBenef,
        exonere: false,
      };
    });

    return {
      montant990I,
      montant757B,
      abattement990I,
      abattement757B,
      assiette990I,
      assiette757B,
      droits990I,
      droits757B,
      totalValeur,
      totalDroits,
      beneficiaireDetails,
      nbTaxable,
    };
  }, [contracts, operationsByContract, subscriberAge, nbBeneficiaires, beneficiaires]);

  // If a contract is selected, show the detail view
  if (selectedContract) {
    return (
      <div className="space-y-4">
        {contracts.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {contracts.map((c) => (
              <Button
                key={c.id}
                variant={c.id === selectedContract.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedContract(c)}
                className="whitespace-nowrap"
              >
                {c.denomination || c.nature}
              </Button>
            ))}
          </div>
        )}
        <AVContractDetail
          contract={selectedContract}
          onBack={() => setSelectedContract(null)}
          subscriberAge={subscriberAge}
          isCouple={isCouple}
        />
      </div>
    );
  }

  const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aucun contrat d'assurance-vie</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez vos contrats d'assurance-vie dans la section Patrimoine pour les visualiser ici.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/patrimoine')}
              className="gap-2"
            >
              Aller au Patrimoine
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre de contrats</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValeur)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fiscalité transmission</p>
                <p className="text-sm font-medium text-muted-foreground">
                  Hors succession (art. L132-12)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal 990I / 757B summary */}
      {subscriberAge !== null && contracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Répartition fiscale en cas de décès
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 990I */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Art. 990 I</Badge>
                    <span className="text-xs text-muted-foreground">Primes avant 70 ans</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capitaux taxables</span>
                    <span className="font-medium">{formatCurrency(fiscalSummary.montant990I)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abattement ({nbBeneficiaires} bénéf. × 152 500 €)</span>
                    <span className="font-medium text-emerald-600">- {formatCurrency(Math.min(fiscalSummary.abattement990I, fiscalSummary.montant990I))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assiette taxable</span>
                    <span className="font-medium">{formatCurrency(fiscalSummary.assiette990I)}</span>
                  </div>
                  {fiscalSummary.assiette990I > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Jusqu'à 700 000 € → 20 %</span>
                        <span>{formatCurrency(Math.min(fiscalSummary.assiette990I, 700000) * 0.20)}</span>
                      </div>
                      {fiscalSummary.assiette990I > 700000 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Au-delà → 31,25 %</span>
                          <span>{formatCurrency((fiscalSummary.assiette990I - 700000) * 0.3125)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Prélèvement estimé</span>
                    <span className="text-destructive">{formatCurrency(fiscalSummary.droits990I)}</span>
                  </div>
                </div>
              </div>

              {/* 757B */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Art. 757 B</Badge>
                    <span className="text-xs text-muted-foreground">Primes après 70 ans</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capitaux taxables</span>
                    <span className="font-medium">{formatCurrency(fiscalSummary.montant757B)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abattement global</span>
                    <span className="font-medium text-emerald-600">- {formatCurrency(Math.min(30500, fiscalSummary.montant757B))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assiette taxable</span>
                    <span className="font-medium">{formatCurrency(fiscalSummary.assiette757B)}</span>
                  </div>
                  {fiscalSummary.assiette757B > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Soumis aux droits de succession</span>
                      <span>≈ 20 %</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Droits estimés</span>
                    <span className="text-destructive">{formatCurrency(fiscalSummary.droits757B)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Estimation simplifiée basée sur l'âge actuel du souscripteur ({subscriberAge} ans). 
                En réalité, le régime applicable dépend de l'âge au moment de chaque versement. 
                Le conjoint ou partenaire de PACS est exonéré dans tous les cas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des contrats - cliquable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrats d'assurance-vie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {contracts.map((contract, index) => (
            <React.Fragment key={contract.id}>
              {index > 0 && <Separator />}
              <button
                className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                onClick={() => setSelectedContract(contract)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {contract.denomination || contract.nature}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {contract.nature}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {contract.etablissement && (
                      <span>{contract.etablissement}</span>
                    )}
                    {contract.detenteur && (
                      <span>Détenteur : {contract.detenteur}</span>
                    )}
                    {contract.date_acquisition && (
                      <span>Ouvert le {new Date(contract.date_acquisition).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrency(contract.valeur_estimee || 0)}
                    </p>
                    {contract.mode_detention && (
                      <p className="text-xs text-muted-foreground">{contract.mode_detention}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Note fiscale */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Régime fiscal de l'assurance-vie en cas de décès</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Primes versées avant 70 ans :</strong> abattement de 152 500 € par bénéficiaire, puis prélèvement de 20 % jusqu'à 700 000 € et 31,25 % au-delà (art. 990 I CGI)</li>
                <li><strong>Primes versées après 70 ans :</strong> abattement global de 30 500 € tous bénéficiaires confondus, excédent soumis aux droits de succession (art. 757 B CGI)</li>
                <li><strong>Conjoint / partenaire PACS :</strong> exonéré dans tous les cas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
