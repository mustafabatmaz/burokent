"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { ReactNode } from "react";

/** Base UI positions popups and handles arrow keys by the page direction. */
export function Providers({ direction, children }: { direction: "ltr" | "rtl"; children: ReactNode }) {
  return <DirectionProvider direction={direction}>{children}</DirectionProvider>;
}
