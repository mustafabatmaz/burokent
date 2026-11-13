import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router";
import { messages } from "../../messages.ts";
import { ConfirmDialog } from "../ConfirmDialog.tsx";

/**
 * Warns before leaving a form with unsaved changes, inside the app and when closing the tab. Call allowLeaving()
 * right before navigating away after a successful save.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const leaving = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const allowLeaving = useCallback(() => {
    leaving.current = true;
  }, []);

  const dialog = (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      title={messages.common.unsavedTitle}
      description={messages.common.unsavedDescription}
      confirmLabel={messages.common.leave}
      cancelLabel={messages.common.stay}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );

  return { dialog, allowLeaving };
}
