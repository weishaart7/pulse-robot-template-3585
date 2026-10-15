import { cn } from '@/lib/utils';
import { AureviaLogo } from './AureviaLogo';

// Indicateur d'action en cours dans un bouton (« Enregistrement… ») : logo Aurevia
// en rotation lente, en currentColor. Le chargeur pleine page (trame animée,
// LoadingSpinner) est illisible à cette taille.
export function LogoSpinner({ className }: { className?: string }) {
  return <AureviaLogo className={cn('h-4 w-4 animate-[spin_1.6s_linear_infinite] motion-reduce:animate-none', className)} />;
}
