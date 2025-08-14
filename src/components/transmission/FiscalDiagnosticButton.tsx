import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { runFiscalDiagnostic } from "@/lib/dmtg/fiscalDiagnostic";
import { computeDMTGCorrected, compareFiscalCalculations } from "@/lib/dmtg/fiscalCorrection";
import { useState } from "react";

export function FiscalDiagnosticButton() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);

  const handleRunDiagnostic = () => {
    // Capture console.log pour afficher dans le modal
    const originalLog = console.log;
    const capturedLogs: string[] = [];
    
    console.log = (...args) => {
      capturedLogs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      const result = runFiscalDiagnostic();
      setDiagnosticResult(result);
      setLogs(capturedLogs);

      // Test de comparaison avec un cas simplifié
      const mockContext = {
        deathDate: '2025-08-14',
        params: {
          abattements: {
            enfant_ascendant: 100000,
            frere_soeur: 15932,
            neveu_niece: 7967,
            tiers: 1594,
            handicap: 159325
          },
          baremes: {
            ligne_directe: [
              { upTo: 8072, rate: 0.05 },
              { upTo: 12109, rate: 0.10 },
              { upTo: 15932, rate: 0.15 },
              { upTo: 552324, rate: 0.20 },
              { upTo: 902838, rate: 0.30 },
              { upTo: 1805677, rate: 0.40 },
              { upTo: null, rate: 0.45 }
            ],
            frere_soeur: [
              { upTo: 24430, rate: 0.35 },
              { upTo: null, rate: 0.45 }
            ],
            autre: [
              { upTo: null, rate: 0.60 }
            ]
          }
        },
        beneficiaries: [
          { id: 'test-ben-1', lien: 'autre' as const },
          { id: 'test-ben-2', lien: 'autre' as const },
          { id: 'test-ben-3', lien: 'autre' as const }
        ]
      } as any;

      const correctedResult = computeDMTGCorrected(mockContext);
      
      // Simulation du résultat actuel (erroné)
      const currentResult = {
        perBeneficiary: {
          'test-ben-1': { droitsHorsAV: 429367 },
          'test-ben-2': { droitsHorsAV: 429367 },
          'test-ben-3': { droitsHorsAV: 429367 }
        }
      } as any;

      const comparisonResult = compareFiscalCalculations(currentResult, correctedResult);
      setComparison(comparisonResult);
      
    } finally {
      console.log = originalLog;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleRunDiagnostic}>
          🔍 Diagnostic Fiscal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Diagnostic des Calculs DMTG</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {diagnosticResult && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Résultats des tests</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={diagnosticResult.test1 ? "text-green-600" : "text-red-600"}>
                    {diagnosticResult.test1 ? "✅" : "❌"}
                  </span>
                  <span>Test référence (enfant 1.2M€ → 292,673€)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={diagnosticResult.test2 ? "text-green-600" : "text-red-600"}>
                    {diagnosticResult.test2 ? "✅" : "❌"}
                  </span>
                  <span>Test cas actuel (tiers 717,206€)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={diagnosticResult.test3 ? "text-green-600" : "text-red-600"}>
                    {diagnosticResult.test3 ? "✅" : "❌"}
                  </span>
                  <span>Test conjoint (exonération)</span>
                </div>
              </div>
            </div>
          )}
          
          {comparison && comparison.differences.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Comparaison Calcul Actuel vs Corrigé</h4>
              <div className="space-y-2">
                {comparison.differences.map((diff: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm">{diff.benId}</span>
                    <div className="text-sm">
                      <span className="text-red-600">Actuel: {diff.current.toLocaleString()}€</span>
                      {' → '}
                      <span className="text-green-600">Corrigé: {diff.corrected.toLocaleString()}€</span>
                      {' '}
                      <span className="font-medium">
                        (Écart: {Math.abs(diff.diff).toLocaleString()}€)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Logs détaillés</h4>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                {logs.join('\n')}
              </div>
            </div>
          )}
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Actions correctives</h4>
            <div className="text-sm space-y-2">
              <p><strong>Problèmes identifiés dans le code actuel :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Calcul des tranches progressives incorrect dans computeProgressiveTax</li>
                <li>Gestion des tranches consommées (consumedBracketsAmount) défaillante</li>
                <li>Arrondi prématuré dans les calculs intermédiaires</li>
                <li>Application d'abattements potentiellement dupliquée</li>
              </ul>
              <p className="mt-3"><strong>Solution :</strong> Utiliser le moteur fiscal simplifié (simpleFiscal.ts) qui implémente correctement :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Application unique des abattements</li>
                <li>Calcul progressif avec consommation des tranches</li>
                <li>Arrondi final uniquement</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}