import * as React from "react"

import { cn, capitalizeFirst } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const cursorPosition = e.target.selectionStart;
      const capitalizedValue = capitalizeFirst(e.target.value);
      e.target.value = capitalizedValue;
      
      if (cursorPosition !== null) {
        setTimeout(() => {
          e.target.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[5px] border border-transparent bg-muted px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:bg-background focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
