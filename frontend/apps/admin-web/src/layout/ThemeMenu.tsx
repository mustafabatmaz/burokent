import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { buttonVariants } from "../components/ui/button.tsx";
import { messages } from "../messages.ts";
import { useThemeContext, type ThemeChoice } from "../theme/theme.ts";

export const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: messages.layout.themes.light, icon: Sun },
  { value: "dark", label: messages.layout.themes.dark, icon: Moon },
  { value: "system", label: messages.layout.themes.system, icon: Monitor },
];

export function ThemeMenu() {
  const { choice, setChoice } = useThemeContext();
  const Current = THEME_OPTIONS.find((option) => option.value === choice)?.icon ?? Monitor;
  return (
    <Menu.Root>
      <Menu.Trigger className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={messages.layout.theme}>
        <Current aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
            <Menu.RadioGroup value={choice} onValueChange={(value: ThemeChoice) => setChoice(value)}>
              {THEME_OPTIONS.map((option) => (
                <Menu.RadioItem
                  key={option.value}
                  value={option.value}
                  className="flex min-h-11 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent"
                >
                  <option.icon className="size-4" aria-hidden />
                  <span className="flex-1">{option.label}</span>
                  <Menu.RadioItemIndicator>
                    <Check className="size-4" aria-hidden />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
