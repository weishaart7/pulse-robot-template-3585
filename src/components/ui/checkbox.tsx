import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

const checkboxVariants = cva(
  "peer shrink-0 rounded-[2px] border border-foreground/35 bg-background text-foreground transition-colors hover:border-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=indeterminate]:border-foreground data-[state=indeterminate]:bg-foreground data-[state=indeterminate]:text-background",
  {
    variants: {
      size: {
        sm: "h-3 w-3",
        default: "h-4 w-4",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  description?: string;
  error?: string;
}

const CheckboxRoot = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, size, label, description, error, id, ...props }, ref) => {
  const checkboxId = id || React.useId();
  const iconSize = size === "sm" ? 10 : size === "lg" ? 14 : 12;

  // Custom SVG check path for drawing animation
  const checkPath = "M3 6l3 3 6-6";
  const minusPath = "M3 6h8";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          className={cn(checkboxVariants({ size }), className)}
          {...props}
        >
          <CheckboxPrimitive.Indicator asChild>
            <div className="flex items-center justify-center text-current">
              <AnimatePresence mode="wait">
                {props.checked === "indeterminate" ? (
                  <motion.svg
                    key="indeterminate"
                    width={iconSize}
                    height={iconSize}
                    viewBox="0 0 14 14"
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.path
                      d={minusPath}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="check"
                    width={iconSize}
                    height={iconSize}
                    viewBox="0 0 14 14"
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.path
                      d={checkPath}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                        delay: 0.1,
                      }}
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {(label || description) && (
          <div className="grid gap-1.5 leading-none">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground peer-disabled:opacity-70">
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive ml-6">
          {error}
        </p>
      )}
    </div>
  );
});

CheckboxRoot.displayName = "Checkbox";

// Simple wrapper that maintains the same API
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>((props, ref) => <CheckboxRoot ref={ref} {...props} />);

Checkbox.displayName = "Checkbox";

export { Checkbox, checkboxVariants, type CheckboxProps };
