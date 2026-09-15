import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface CheckboxWithLabelProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function CheckboxWithLabel({ checked, onCheckedChange, label, disabled, className }: CheckboxWithLabelProps) {
  return (
    <FormItem className="flex flex-row items-center h-9 space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className={cn(disabled && "text-muted-foreground", className)}>{label}</FormLabel>
      </div>
    </FormItem>
  );
}
