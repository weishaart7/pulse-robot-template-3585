import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAlertesConseil } from '@/hooks/useAlertesConseil';
import { NiveauAlerte } from '@/lib/alertes';

const NIVEAU_STYLES: Record<NiveauAlerte, string> = {
  critique: 'rounded-card bg-destructive/[0.06] border-destructive/25 text-destructive [&>svg]:text-destructive',
  eleve: 'rounded-card bg-spark/[0.06] border-spark/25 [&>svg]:text-spark',
  moyen: 'rounded-card bg-secondary border-border',
};

export function AlertesConseil() {
  const { alertes, loading } = useAlertesConseil();

  if (loading || alertes.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {alertes.map((alerte) => (
        <Alert key={alerte.id} className={NIVEAU_STYLES[alerte.niveau]}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{alerte.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
