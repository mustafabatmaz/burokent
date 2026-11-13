import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/** Native select: the phone shows its own picker, and it works with keyboard and screen readers out of the box. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-lg border border-input bg-card px-3 text-base disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
