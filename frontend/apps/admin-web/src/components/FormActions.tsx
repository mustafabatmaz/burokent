import type { ReactNode } from "react";
import { messages } from "../messages.ts";
import { Button } from "./ui/button.tsx";

/** Save button that stays visible at the bottom of long forms; full width on phones. */
export function FormActions({ submitting, children }: { submitting: boolean; children?: ReactNode }) {
  return (
    <div className="sticky bottom-20 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end md:bottom-0 md:mx-0 md:rounded-b-xl md:px-0">
      {children}
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? messages.common.saving : messages.common.save}
      </Button>
    </div>
  );
}
