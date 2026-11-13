import { Menu } from "@base-ui/react/menu";
import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { useLogout, useSession } from "../auth/session.tsx";
import { buttonVariants } from "../components/ui/button.tsx";
import { cn } from "../lib/cn.ts";
import { messages } from "../messages.ts";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function UserMenu() {
  const me = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(buttonVariants({ variant: "ghost" }), "px-2")}
        aria-label={messages.layout.userMenu(me.displayName)}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(me.displayName)}
        </span>
        <span className="hidden max-w-40 truncate md:inline">{me.displayName}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="min-w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{me.displayName}</p>
              <p className="text-xs text-muted-foreground">{me.username}</p>
            </div>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              onClick={() => void navigate("/hesap/sifre")}
              className="flex min-h-11 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent"
            >
              <KeyRound className="size-4" aria-hidden />
              {messages.account.changePassword}
            </Menu.Item>
            <Menu.Item
              onClick={() => void logout()}
              className="flex min-h-11 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent"
            >
              <LogOut className="size-4" aria-hidden />
              {messages.layout.logout}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
