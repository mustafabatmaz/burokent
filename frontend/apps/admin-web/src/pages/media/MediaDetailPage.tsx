import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useParams } from "react-router";
import { Can } from "../../auth/Can.tsx";
import { useSession } from "../../auth/session.tsx";
import { ConfirmDialog } from "../../components/ConfirmDialog.tsx";
import { Field, fieldA11y } from "../../components/form/Field.tsx";
import { applyServerErrors } from "../../components/form/serverErrors.ts";
import { useUnsavedChanges } from "../../components/form/useUnsavedChanges.tsx";
import { FormActions } from "../../components/FormActions.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button, buttonVariants } from "../../components/ui/button.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { AuditHistory } from "../../features/audit/AuditHistory.tsx";
import { formatDateTime } from "../../features/audit/format.ts";
import {
  formatBytes,
  MEDIA_LOCALES,
  mediaQuery,
  type MediaLocale,
  type MediaView,
} from "../../features/media/queries.ts";
import { api } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { asProblem } from "../../lib/problem.ts";
import { errorText, messages } from "../../messages.ts";
import { NotFoundPage } from "../NotFoundPage.tsx";

type Values = Record<MediaLocale, string>;

function toValues(media: MediaView): Values {
  return { tr: media.altText.tr ?? "", en: media.altText.en ?? "", ar: media.altText.ar ?? "" };
}

export function MediaDetailPage() {
  const id = Number(useParams().id);
  const media = useQuery(mediaQuery(id));

  if (media.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {messages.loading}
      </p>
    );
  }
  if (media.isError) {
    return asProblem(media.error).code === "not_found" ? <NotFoundPage /> : <p>{messages.common.loadError}</p>;
  }
  const item = media.data;
  const d = messages.media.details;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold break-all">{item.originalFileName}</h1>
        {item.archived && <Badge>{messages.common.archived}</Badge>}
      </div>
      <Card className="grid gap-4 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:p-6">
        <img
          src={item.previewUrl}
          alt={item.altText.tr ?? ""}
          width={item.width}
          height={item.height}
          className="max-h-[60vh] w-full rounded-lg bg-muted object-contain"
        />
        <dl className="grid content-start gap-3 text-sm">
          <Detail term={d.dimensions} value={`${item.width} × ${item.height}`} />
          <Detail term={d.fileSize} value={formatBytes(item.byteSize)} />
          <Detail term={d.type} value={item.contentType === "image/png" ? "PNG" : "JPEG"} />
          <Detail term={d.uploadedAt} value={formatDateTime(item.createdAt)} />
          <a
            href={item.previewUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-self-start")}
          >
            <ExternalLink aria-hidden />
            {messages.media.actions.open}
          </a>
        </dl>
      </Card>
      <AltTextForm media={item} />
      <Can permission="media.manage">
        <ArchiveAction media={item} />
      </Can>
      <AuditHistory entityType="media" entityId={String(id)} />
    </div>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function AltTextForm({ media }: { media: MediaView }) {
  const me = useSession();
  const canManage = me.permissions.includes("media.manage");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [conflict, setConflict] = useState(false);
  const form = useForm<Values>({ values: toValues(media) });
  const { isDirty, isSubmitting } = form.formState;
  const { dialog } = useUnsavedChanges(isDirty);

  async function submit(values: Values) {
    const altText = Object.fromEntries(
      MEDIA_LOCALES.map((locale) => [locale, values[locale].trim() || null]),
    ) as Record<MediaLocale, string | null>;
    const { data, error } = await api.PUT("/api/admin/media/{id}", {
      params: { path: { id: media.id } },
      // null clears a language; the generated type only knows "absent"
      body: { altText: altText as MediaView["altText"], version: media.version },
    });
    if (!data) {
      const problem = asProblem(error);
      if (problem.code === "conflict") {
        setConflict(true);
      } else if (
        !applyServerErrors(form, problem.errors ? { ...problem, errors: problem.errors.map(stripPrefix) } : problem)
      ) {
        toast.error(errorText(problem.code));
      }
      return;
    }
    queryClient.setQueryData(mediaQuery(media.id).queryKey, data);
    await queryClient.invalidateQueries({ queryKey: ["media", "list"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    toast.success(messages.media.updated);
  }

  async function reload() {
    setConflict(false);
    await queryClient.invalidateQueries({ queryKey: mediaQuery(media.id).queryKey });
  }

  return (
    <Card className="p-4 md:p-6">
      <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">{messages.media.altText}</h2>
          <p className="text-sm text-muted-foreground">{messages.media.altTextHint}</p>
        </div>
        <fieldset disabled={!canManage}>
          <LocaleTabs form={form} saved={media.altText} />
        </fieldset>
        {canManage && <FormActions submitting={isSubmitting} />}
      </form>
      {dialog}
      <ConfirmDialog
        open={conflict}
        title={messages.common.conflictTitle}
        description={messages.common.conflictDescription}
        confirmLabel={messages.common.reload}
        onConfirm={() => void reload()}
        onCancel={() => setConflict(false)}
      />
    </Card>
  );
}

/** The backend names fields "altText.tr"; the form's fields are just "tr". */
function stripPrefix(error: { field: string; code: string }) {
  return { ...error, field: error.field.replace(/^altText\./, "") };
}

/** TR / EN / AR tabs; every panel stays mounted, so the form keeps all three values. */
function LocaleTabs({ form, saved }: { form: UseFormReturn<Values>; saved: MediaView["altText"] }) {
  const [selected, setSelected] = useState<MediaLocale>("tr");
  const baseId = useId();
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const errors = form.formState.errors;

  function onKeyDown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const index = (MEDIA_LOCALES.indexOf(selected) + step + MEDIA_LOCALES.length) % MEDIA_LOCALES.length;
    const next = MEDIA_LOCALES[index]!;
    setSelected(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={messages.media.altText} className="flex gap-1 border-b" onKeyDown={onKeyDown}>
        {MEDIA_LOCALES.map((locale) => (
          <button
            key={locale}
            ref={(element) => {
              tabs.current[locale] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${locale}`}
            aria-selected={selected === locale}
            aria-controls={`${baseId}-panel-${locale}`}
            tabIndex={selected === locale ? 0 : -1}
            onClick={() => setSelected(locale)}
            className={cn(
              "-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium",
              selected === locale
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {messages.media.locales[locale]}
            {!saved[locale] && <Badge>{messages.media.missing}</Badge>}
            {errors[locale] && <span className="size-2 rounded-full bg-destructive" aria-hidden />}
          </button>
        ))}
      </div>
      {MEDIA_LOCALES.map((locale) => (
        <div
          key={locale}
          role="tabpanel"
          id={`${baseId}-panel-${locale}`}
          aria-labelledby={`${baseId}-tab-${locale}`}
          hidden={selected !== locale}
        >
          <Field id={`alt-${locale}`} label={messages.media.altTextIn(locale)} error={errors[locale]?.message}>
            <Input
              {...fieldA11y(`alt-${locale}`, errors[locale]?.message)}
              lang={locale}
              dir={locale === "ar" ? "rtl" : "ltr"}
              maxLength={250}
              {...form.register(locale, { maxLength: { value: 250, message: messages.errors.size! } })}
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

function ArchiveAction({ media }: { media: MediaView }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const a = messages.media.actions;

  async function run() {
    const path = { params: { path: { id: media.id } } };
    const result = media.archived
      ? await api.POST("/api/admin/media/{id}/unarchive", path)
      : await api.POST("/api/admin/media/{id}/archive", path);
    setOpen(false);
    if (!result.response.ok) {
      toast.error(errorText(asProblem(result.error).code));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["media"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    toast.success(media.archived ? messages.media.unarchivedToast : messages.media.archivedToast);
  }

  return (
    <Card className="flex flex-col gap-2 p-4 sm:flex-row md:p-6">
      <Button variant="outline" onClick={() => (media.archived ? void run() : setOpen(true))}>
        {media.archived ? a.unarchive : a.archive}
      </Button>
      <ConfirmDialog
        open={open}
        title={messages.media.confirmArchive}
        description={messages.media.confirmArchiveDescription}
        confirmLabel={a.archive}
        onConfirm={() => void run()}
        onCancel={() => setOpen(false)}
      />
    </Card>
  );
}
