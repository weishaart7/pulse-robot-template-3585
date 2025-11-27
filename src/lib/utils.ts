import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeFirst(value: string): string {
  if (!value) return value;
  // Ne force pas le lowercase pour préserver les noms composés, acronymes, etc.
  return value.charAt(0).toUpperCase() + value.slice(1);
}
