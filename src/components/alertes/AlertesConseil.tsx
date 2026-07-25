import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAlertesConseil } from '@/hooks/useAlertesConseil';
import { NiveauAlerte } from '@/lib/alertes';

const NIVEAU_STYLES: Record<NiveauAlerte, string> = {
  critique: 'bg-[var(--negative-soft)] border-[var(--negative)]/30 text-[var(--negative)]',
  eleve: 'bg-[var(--warning-soft)] border-[var(--warning)]/30',
  moyen: 'bg-[var(--surface-sunken)] border-[var(--border)]',
};

export function AlertesConseil() {
  const { alertes, loading } = useAlertesConseil();

  if (loading || alertes.length === 0) return null;

  return (
    <div className="space-y-3">
      {alertes.map((alerte) => (
        <Alert key={alerte.id} className={NIVEAU_STYLES[alerte.niveau]}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{alerte.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
