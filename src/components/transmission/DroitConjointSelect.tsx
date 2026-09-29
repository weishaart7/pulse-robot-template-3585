import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';

export type DroitConjoint = 'pleine_propriete' | 'usufruit';

/**
 * Droit transmis au conjoint par une donation ou un legs : pleine propriété ou
 * usufruit (quotité spéciale entre époux, C. civ. art. 1094-1). En usufruit,
 * le montant saisi est celle des biens grevés.
 */
export function DroitConjointSelect({ id, value, onChange }: {
  id: string;
  value: DroitConjoint;
  onChange: (value: DroitConjoint) => void;
}) {
  return (
    <div className="mt-3">
      <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1">
        Droit transmis au conjoint
        <FieldHelp>
          En usufruit, indiquez la valeur en pleine propriété des biens grevés : la libéralité est valorisée
          selon l'âge du conjoint (barème art. 669 CGI) et s'impute sur la quotité disponible spéciale entre
          époux (C. civ. art. 1094-1), qui peut atteindre la totalité des biens en usufruit.
        </FieldHelp>
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as DroitConjoint)}>
        <SelectTrigger id={id} className="mt-1 w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pleine_propriete">Pleine propriété</SelectItem>
          <SelectItem value="usufruit">Usufruit</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
