import { cn, capitalizeFirst } from "@/lib/utils";
import * as React from "react";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "text" || !type) {
        const cursorPosition = e.target.selectionStart;
        const capitalizedValue = capitalizeFirst(e.target.value);
        e.target.value = capitalizedValue;
        
        if (cursorPosition !== null) {
          setTimeout(() => {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }, 0);
        }
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 aria-invalid:border-destructive/60 aria-invalid:ring-1 aria-invalid:ring-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border",
          type === "search" &&
            "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
          type === "file" &&
            "p-0 pr-3 italic text-muted-foreground/70 file:me-3 file:h-full file:border-0 file:border-r file:border-solid file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-foreground",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
