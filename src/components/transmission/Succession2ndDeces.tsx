import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePassifs } from '@/hooks/usePassifs';
import {
  buildFamilyGraph,
  buildPatrimonySnapshot,
  buildTransmissionLiberalites,
  buildAVContracts,
  buildSpouseAsDecedentFamilyGraph,
  buildSurvivingSpousePatrimony,
  buildSpouseRawAssets,
  buildSpouseOwnBasePatrimony,
  addReunifiedFullOwnership,
  widowFamilyGraph,
  AVContractRawRow,
  AVDonneesInsuffisantesError,
  SpouseSuccessionNonModelisableError
} from '@/utils/transmissionHelpers';
import {
  computeTransmission,
  computeChainedTransmission,
  ChainedTransmissionResult,
  FamilyGraph,
  TransmissionParams,
  TransmissionContext
} from '@/lib/transmission';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { getAssetCategory } from '@/constants/assetTypes';
import transmissionParamsData from '@/data/transmission-params.json';
import './kairos-transmission.css';

type Ordre = 'normal' | 'inverse';

interface OrdreResult {
  result: ChainedTransmissionResult | null;
  errorMessage: string | null;
  errorKind: 'bien-non-qualifie' | 'av-donnees-insuffisantes' | 'conjoint-sans-enfant' | 'autre' | null;
}

const EMPTY_ORDRE_RESULT: OrdreResult = { result: null, errorMessage: null, errorKind: null };

export const Succession2ndDeces = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { passifs, loading: passifsLoading } = usePassifs();
  const [loading, setLoading] = useState(true);
  const [ordre, setOrdre] = useState<Ordre>('normal');
  const [nomUtilisateur, setNomUtilisateur] = useState('Vous');
  const [nomConjoint, setNomConjoint] = useState('Votre conjoint');
  const [resultsByOrdre, setResultsByOrdre] = useState<Record<Ordre, OrdreResult>>({
    normal: EMPTY_ORDRE_RESULT,
    inverse: EMPTY_ORDRE_RESULT
  });

  useEffect(() => {
    if (user && !passifsLoading) {
      fetchAndCompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, passifsLoading, passifs]);

  const buildParams = (): TransmissionParams => ({
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I,
    debours: {
      mode: transmissionParamsData.debours.mode as 'pourcentage' | 'forfait',
      valeur: transmissionParamsData.debours.valeur
    }
  });

  const errorToOrdreResult = (error: unknown): OrdreResult => {
    if (error instanceof BienNonQualifieError) {
      return { result: null, errorMessage: error.message, errorKind: 'bien-non-qualifie' };
    }
    if (error instanceof AVDonneesInsuffisantesError) {
      return { result: null, errorMessage: error.message, errorKind: 'av-donnees-insuffisantes' };
    }
    if (error instanceof SpouseSuccessionNonModelisableError) {
      return { result: null, errorMessage: error.message, errorKind: 'conjoint-sans-enfant' };
    }
    if (import.meta.env.DEV) console.error('Erreur calcul succession 2nd décès:', error);
    return {
      result: null,
      errorMessage: error instanceof Error ? error.message : 'Erreur inconnue lors du calcul.',
      errorKind: 'autre'
    };
  };

  const fetchAndCompute = async () => {
    try {
      setLoading(true);

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

      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user!.id);

      const avAssets = (assets || []).filter(a => getAssetCategory(a.nature || '') === 'épargne et assurance-vie');
      const totalAV = avAssets.reduce((sum, a) => sum + (Number(a.valeur_estimee) || 0), 0);
      const avAssetIds = avAssets.map(a => a.id);
      const [avDetailsRes, avOperationsRes] = avAssetIds.length > 0
        ? await Promise.all([
            supabase.from('av_contract_details').select('asset_id, clause_beneficiaire_structuree').in('asset_id', avAssetIds),
            supabase.from('av_operations').select('asset_id, type_operation, montant, date_operation').in('asset_id', avAssetIds)
          ])
        : [{ data: [] }, { data: [] }];

      const avClauseByAsset = new Map<string, any>(
        (avDetailsRes.data || []).map((d: any) => [d.asset_id, d.clause_beneficiaire_structuree || null])
      );
      const avOperationsByAsset = new Map<string, { type_operation: string; montant: number | null; date_operation: string }[]>();
      (avOperationsRes.data || []).forEach((op: any) => {
        const list = avOperationsByAsset.get(op.asset_id) || [];
        list.push({ type_operation: op.type_operation, montant: op.montant, date_operation: op.date_operation });
        avOperationsByAsset.set(op.asset_id, list);
      });
      const avContractsRaw: AVContractRawRow[] = avAssets.map(a => ({
        assetId: a.id,
        label: a.denomination,
        valeurEstimee: a.valeur_estimee,
        operations: avOperationsByAsset.get(a.id) || [],
        clauseBeneficiaireStructuree: avClauseByAsset.get(a.id) || null
      }));

      const { data: liberalites } = await supabase
        .from('liberalites')
        .select('*')
        .eq('user_id', user!.id);
      const { liberalites: liberalitesFormatted } = buildTransmissionLiberalites(liberalites || [], assets || []);

      setNomUtilisateur(`${familyProfile?.prenom || ''} ${familyProfile?.nom || ''}`.trim() || 'Vous');
      setNomConjoint(`${maritalStatus?.prenom_conjoint || ''} ${maritalStatus?.nom_conjoint || ''}`.trim() || 'Votre conjoint');

      const params = buildParams();
      const referenceDate = new Date().toISOString().split('T')[0];
      const optionConjoint = (maritalStatus as any)?.option_conjoint as string | null;
      const partageEnvisage = !!(maritalStatus as any)?.partage_envisage;

      // Graphe et contexte "Utilisateur décède en premier" : identiques à ce
      // que Synthese.tsx construit déjà pour le 1er décès — même fonctions,
      // aucune logique nouvelle.
      const familyUtilisateur: FamilyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks || []);
      const avContractsUtilisateur = buildAVContracts(avContractsRaw, familyProfile?.date_naissance, familyUtilisateur);
      const patrimonyUtilisateur = buildPatrimonySnapshot(assets || [], passifs, totalAV);
      const ctxUtilisateurDecede: TransmissionContext = {
        family: familyUtilisateur,
        patrimony: patrimonyUtilisateur,
        liberalites: liberalitesFormatted,
        params,
        conjointOption: (optionConjoint as any) || undefined,
        referenceDate,
        rawAssets: assets || [],
        avContracts: avContractsUtilisateur,
        partageEnvisage
      };

      // --- Ordre normal (Utilisateur d'abord) ---
      let normalResult: OrdreResult;
      try {
        const firstDeathUtilisateur = computeTransmission(ctxUtilisateurDecede);
        const spouseFamily = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, familyLinks || []);
        // Passifs du conjoint : mêmes lignes que le 1er décès, non repondérées
        // par détenteur (choix aligné sur buildPatrimonySnapshot, qui ne
        // pondère pas non plus les passifs du 1er défunt aujourd'hui — cf.
        // limitation documentée dans le résumé remis à l'utilisateur).
        const spousePatrimony = buildSurvivingSpousePatrimony(
          assets || [],
          passifs,
          firstDeathUtilisateur,
          familyUtilisateur.survivingSpouseId!,
          []
        );
        const chained = computeChainedTransmission({
          firstDeath: ctxUtilisateurDecede,
          secondDeath: {
            family: spouseFamily,
            patrimony: spousePatrimony,
            liberalites: [],
            params,
            referenceDate,
            rawAssets: buildSpouseRawAssets(assets || []),
            avContracts: []
          }
        });
        normalResult = { result: chained, errorMessage: null, errorKind: null };
      } catch (error) {
        normalResult = errorToOrdreResult(error);
      }

      // --- Ordre inversé (conjoint d'abord) ---
      let inverseResult: OrdreResult;
      try {
        const spouseFamilyFirst = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, familyLinks || []);
        const spouseBasePatrimony = buildSpouseOwnBasePatrimony(assets || [], passifs);
        const ctxConjointDecede: TransmissionContext = {
          family: spouseFamilyFirst,
          patrimony: spouseBasePatrimony,
          liberalites: [],
          params,
          referenceDate,
          rawAssets: buildSpouseRawAssets(assets || []),
          avContracts: []
        };
        const firstDeathConjoint = computeTransmission(ctxConjointDecede);

        const utilisateurVeufFamily = widowFamilyGraph(familyUtilisateur, familyLinks || []);
        const utilisateurBasePatrimony = buildPatrimonySnapshot(assets || [], passifs, 0);
        const utilisateurVeufPatrimony = addReunifiedFullOwnership(
          utilisateurBasePatrimony,
          firstDeathConjoint,
          familyUtilisateur.decedentId,
          avContractsUtilisateur
        );

        const chainedInverse = computeChainedTransmission({
          firstDeath: ctxConjointDecede,
          secondDeath: {
            family: utilisateurVeufFamily,
            patrimony: utilisateurVeufPatrimony,
            liberalites: [],
            params,
            referenceDate,
            rawAssets: assets || [],
            avContracts: []
          }
        });
        inverseResult = { result: chainedInverse, errorMessage: null, errorKind: null };
      } catch (error) {
        inverseResult = errorToOrdreResult(error);
      }

      setResultsByOrdre({ normal: normalResult, inverse: inverseResult });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur lors du calcul de la succession 2nd décès:', error);
      setResultsByOrdre({
        normal: errorToOrdreResult(error),
        inverse: errorToOrdreResult(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="kairos-transmission flex justify-center items-center h-64">
        <div className="text-lg text-[var(--text-secondary)]">Calcul en cours...</div>
      </div>
    );
  }

  const current = resultsByOrdre[ordre];
  const decedentFirstNom = ordre === 'normal' ? nomUtilisateur : nomConjoint;
  const decedentSecondNom = ordre === 'normal' ? nomConjoint : nomUtilisateur;

  return (
    <div className="kairos-transmission space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Ordre des décès :</span>
        <div className="inline-flex rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOrdre('normal')}
            className={
              'px-4 py-2 text-sm font-medium transition-colors ' +
              (ordre === 'normal'
                ? 'bg-[var(--ink-900)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
            }
          >
            {nomUtilisateur} d'abord
          </button>
          <button
            type="button"
            onClick={() => setOrdre('inverse')}
            className={
              'px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--border)] ' +
              (ordre === 'inverse'
                ? 'bg-[var(--ink-900)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
            }
          >
            {nomConjoint} d'abord
          </button>
        </div>
      </div>

      {!current.result ? (
        <div className="kairos-transmission text-center py-12">
          <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Calcul indisponible pour cet ordre</h3>
          <p className="text-[var(--text-secondary)] mb-4 max-w-xl mx-auto">
            {current.errorMessage || 'Données insuffisantes pour simuler ce second décès.'}
          </p>
          {current.errorKind === 'av-donnees-insuffisantes' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/transmission?tab=assurance-vie')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
            >
              Renseigner le contrat dans Assurance-vie
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {current.errorKind === 'bien-non-qualifie' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/patrimoine?tab=actifs')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
            >
              Qualifier ce bien dans Patrimoine
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {current.errorKind === 'conjoint-sans-enfant' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/famille')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
            >
              Renseigner la famille dans le module Famille
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Succession2ndDecesContent
          result={current.result}
          decedentSecondNom={decedentSecondNom}
          decedentFirstNom={decedentFirstNom}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

interface ContentProps {
  result: ChainedTransmissionResult;
  decedentFirstNom: string;
  decedentSecondNom: string;
  formatCurrency: (amount: number) => string;
}

const Succession2ndDecesContent: React.FC<ContentProps> = ({
  result,
  decedentFirstNom,
  decedentSecondNom,
  formatCurrency
}) => {
  const { secondDeath, reunionUsufruit, transmissionNetteCombinee } = result;

  // Noms d'affichage : d'abord les héritiers du 2nd décès lui-même, puis les
  // nu-propriétaires du 1er décès pour ceux qui ne sont pas des héritiers du
  // 2nd décès (ex. enfant non commun d'une famille recomposée, cf.
  // secondDeces.test.ts) — cf. décision actée : cet onglet n'a pas besoin
  // d'afficher le détail du 1er décès, seulement de nommer correctement ses
  // nu-propriétaires ici.
  const nameById = new Map<string, string>();
  secondDeath.heirs.forEach(h => nameById.set(h.personId, h.nom));
  result.firstDeath.heirs.forEach(h => {
    if (!nameById.has(h.personId)) nameById.set(h.personId, h.nom);
  });

  const droitsTotal = secondDeath.dmtg.totals.droitsTotaux;
  const masseFiscale = secondDeath.masseCalcul;

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Succession de {decedentSecondNom} (2nd décès)
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Patrimoine propre de {decedentSecondNom} à l'issue du 1er décès de {decedentFirstNom} — sans l'usufruit
            qu'il/elle détenait, réuni séparément ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(masseFiscale)}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">Masse fiscale</div>
            </div>
            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(droitsTotal)}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">Droits de succession</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Réunion de l'usufruit
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Art. 1133 CGI — l'usufruit que {decedentSecondNom} détenait sur la part de {decedentFirstNom} s'éteint à
            son décès et complète directement la propriété des nu-propriétaires, <strong>sans taxation</strong> et
            sans jamais entrer dans la masse fiscale ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--positive-subtle,var(--surface-sunken))] px-5 py-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Valeur totale réunie, hors taxation
            </span>
            <span className="kairos-num text-[20px] font-semibold text-[var(--text-primary)]">
              + {formatCurrency(reunionUsufruit.total)}
            </span>
          </div>

          {reunionUsufruit.parNuProprietaire.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nu-propriétaire (1er décès)</TableHead>
                  <TableHead className="text-right">Part réunie, hors taxation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reunionUsufruit.parNuProprietaire.map(part => (
                  <TableRow key={part.personId}>
                    <TableCell>{nameById.get(part.personId) || part.personId}</TableCell>
                    <TableCell className="text-right kairos-num">{formatCurrency(part.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Transmission nette combinée
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Héritage net du 2nd décès + réunion d'usufruit hors taxation, par bénéficiaire.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead className="text-right">Droits de succession</TableHead>
                <TableHead className="text-right">Réunion d'usufruit</TableHead>
                <TableHead className="text-right">Transmission nette</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transmissionNetteCombinee.map(entry => {
                const netHeir = secondDeath.netBreakdown.heirs.find(h => h.personId === entry.personId);
                const reunion = reunionUsufruit.parNuProprietaire.find(r => r.personId === entry.personId);
                return (
                  <TableRow key={entry.personId}>
                    <TableCell>{nameById.get(entry.personId) || entry.personId}</TableCell>
                    <TableCell className="text-right kairos-num">
                      {formatCurrency(netHeir?.droitsDMTG || 0)}
                    </TableCell>
                    <TableCell className="text-right kairos-num">
                      {reunion ? `+ ${formatCurrency(reunion.montant)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right kairos-num font-semibold">
                      {formatCurrency(entry.montant)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
