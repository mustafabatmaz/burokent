import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button, buttonVariants } from "../components/ui/button.tsx";
import { cn } from "../lib/cn.ts";
import { messages } from "../messages.ts";
import { useThemeContext } from "../theme/theme.ts";
import type { NavGroup } from "./navigation.ts";
import { NavLinks } from "./NavLinks.tsx";
import { THEME_OPTIONS } from "./ThemeMenu.tsx";

/** Full-screen menu behind the "Menü" tab on phones. */
export function MobileMenu({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: NavGroup[];
}) {
  const { choice, setChoice } = useThemeContext();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{messages.layout.menu}</Dialog.Title>
            <Dialog.Close
              className={buttonVariants({ variant: "ghost", size: "icon" })}
              aria-label={messages.layout.closeMenu}
            >
              <X aria-hidden />
            </Dialog.Close>
          </div>
          <NavLinks groups={groups} onNavigate={() => onOpenChange(false)} />
          <div className="mt-6 flex flex-col gap-2">
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase">{messages.layout.theme}</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={choice === option.value ? "secondary" : "outline"}
                  aria-pressed={choice === option.value}
                  onClick={() => setChoice(option.value)}
                  className={cn("flex-col gap-1 h-16")}
                >
                  <option.icon aria-hidden />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
