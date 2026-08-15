import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { AutoSaveStatus } from '@/hooks/useAutoSave';

interface SaveStatusIndicatorProps {
  status: AutoSaveStatus;
  className?: string;
}

export function SaveStatusIndicator({ status, className = '' }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Enregistrement...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in ${className}`}>
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        Enregistré
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-destructive ${className}`}>
      <AlertCircle className="h-3.5 w-3.5" />
      Échec de l'enregistrement
    </span>
  );
}
