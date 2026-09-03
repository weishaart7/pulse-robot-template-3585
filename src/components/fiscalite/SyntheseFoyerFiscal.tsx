import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';

interface SyntheseFoyerFiscalProps {
  foyer: FoyerFiscalInput;
}

function formatParts(parts: number): string {
  return parts.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const SyntheseFoyerFiscal = ({ foyer }: SyntheseFoyerFiscalProps) => {
  const result = calculerPartsFiscales(foyer);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nombre de parts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">{formatParts(result.nombreParts)} part{result.nombreParts > 1 ? 's' : ''}</div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Parts de base</span>
            <span className="font-medium">{formatParts(result.partsBase)}</span>
          </div>

          {result.majorations.map(m => (
            <div key={m.type} className="flex items-center justify-between">
              <span className="text-muted-foreground">{m.libelle}</span>
              <span className="font-medium">+{formatParts(m.parts)}</span>
            </div>
          ))}

          {result.majorations.length === 0 && (
            <p className="text-muted-foreground">Aucune majoration applicable.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SyntheseFoyerFiscal;
