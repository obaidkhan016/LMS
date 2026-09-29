import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1.5 block text-[13px] font-medium text-fg", className)}
    {...props}
  >
    {children}
  </label>
));
Label.displayName = "Label";