import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { messages } from "../messages.ts";

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="flex items-start gap-3 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-lg data-[type=error]:border-destructive"
    >
      <div className="flex-1">
        <Toast.Title className="font-medium" />
        <Toast.Description className="text-muted-foreground" />
      </div>
      <Toast.Close aria-label={messages.layout.closeMenu} className="text-muted-foreground">
        <X className="size-4" aria-hidden />
      </Toast.Close>
    </Toast.Root>
  ));
}

/** Short confirmations ("Kaydedildi") at the bottom of the screen, above the phone's tab bar. */
export function Toaster({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport
          aria-label={messages.layout.notifications}
          className="fixed inset-x-4 bottom-20 z-[60] flex flex-col gap-2 md:start-auto md:end-6 md:bottom-6 md:w-96"
        >
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export function useToast() {
  const manager = Toast.useToastManager();
  return {
    success: (title: string) => manager.add({ title }),
    error: (title: string) => manager.add({ title, type: "error", priority: "high" }),
  };
}
