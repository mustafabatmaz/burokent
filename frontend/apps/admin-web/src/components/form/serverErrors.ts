import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { errorText } from "../../messages.ts";
import type { Problem } from "../../lib/problem.ts";

/**
 * Shows server-side validation errors under the matching form fields and focuses the first one. fieldForCode maps
 * general error codes to a field (for example username_taken → username). Returns false when nothing could be shown
 * on a field, so the caller can show a general message instead.
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  problem: Problem,
  fieldForCode: Record<string, Path<T>> = {},
): boolean {
  const fields = Object.keys(form.getValues());
  const placed: { field: Path<T>; code: string }[] = [];
  for (const error of problem.errors ?? []) {
    if (fields.includes(error.field)) {
      placed.push({ field: error.field as Path<T>, code: error.code });
    }
  }
  const mapped = problem.code ? fieldForCode[problem.code] : undefined;
  if (mapped && problem.code) {
    placed.push({ field: mapped, code: problem.code });
  }
  placed.forEach(({ field, code }, index) =>
    form.setError(field, { type: "server", message: errorText(code) }, { shouldFocus: index === 0 }),
  );
  return placed.length > 0;
}
