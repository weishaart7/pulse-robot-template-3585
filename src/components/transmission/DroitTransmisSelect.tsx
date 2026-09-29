import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';

export type DroitTransmis = 'pleine_propriete' | 'usufruit';

/**
 * Droit transmis par une donation ou un legs : pleine propriété ou usufruit
 * viager. En usufruit, le montant saisi est la valeur en pleine propriété des
 * biens grevés ; la libéralité est valorisée selon l'âge du bénéficiaire
 * (barème art. 669 CGI) et imputée « en assiette » sur la quotité disponible
 * (Cass. civ. 1, 22 juin 2022), ou sur la quotité spéciale pour le conjoint
 * (C. civ. art. 1094-1).
 */
export function DroitTransmisSelect({ id, value, onChange }: {
  id: string;
  value: DroitTransmis;
  onChange: (value: DroitTransmis) => void;
}) {
  return (
    <div className="mt-3">
      <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1">
        Droit transmis
        <FieldHelp>
          En usufruit (viager), indiquez la valeur en pleine propriété des biens grevés : la libéralité est
          valorisée selon l'âge du bénéficiaire au décès (barème art. 669 CGI) et s'impute « en assiette » sur
          la quotité disponible — ou, pour le conjoint, sur la quotité spéciale entre époux (C. civ. art.
          1094-1), qui peut atteindre la totalité des biens en usufruit. Date de naissance du bénéficiaire
          requise.
        </FieldHelp>
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as DroitTransmis)}>
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
