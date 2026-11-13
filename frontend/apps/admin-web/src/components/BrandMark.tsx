import { cn } from "../lib/cn.ts";

/**
 * The crown sign: walnut on light, gold on dark backgrounds. className sizes the images; put visibility classes on a
 * wrapper, because the light/dark switch already sets display on each image.
 */
export function CrownMark({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/burokent-tac-ceviz.svg" alt="" className={cn("dark:hidden", className)} />
      <img src="/brand/burokent-tac-altin.svg" alt="" className={cn("hidden dark:block", className)} />
    </>
  );
}

/** The full logo, only used on the login page. */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/burokent-logo-ceviz.svg" alt="BüroKent" className={cn("dark:hidden", className)} />
      <img src="/brand/burokent-logo-altin.svg" alt="BüroKent" className={cn("hidden dark:block", className)} />
    </>
  );
}
