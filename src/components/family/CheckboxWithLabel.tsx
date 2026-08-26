import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';

interface CheckboxWithLabelProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function CheckboxWithLabel({ checked, onCheckedChange, label }: CheckboxWithLabelProps) {
  return (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>{label}</FormLabel>
      </div>
    </FormItem>
  );
}
