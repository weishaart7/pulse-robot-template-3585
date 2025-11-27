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
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
