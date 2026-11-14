import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can } from "../../auth/Can.tsx";
import { Pager } from "../../components/data-table/DataTable.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Card } from "../../components/ui/card.tsx";
import {
  ACCEPTED_TYPES,
  checkBeforeUpload,
  mediaListQuery,
  uploadImage,
  type MediaFilter,
  type MediaView,
} from "../../features/media/queries.ts";
import { cn } from "../../lib/cn.ts";
import { errorText, messages } from "../../messages.ts";

// Filters live in the address, so a view can be shared or bookmarked
const PARAM = { archived: "arsiv", page: "sayfa", size: "boyut" };

export function MediaListPage() {
  const [params, setParams] = useSearchParams();
  const filter: MediaFilter = {
    archived: params.get(PARAM.archived) === "1",
    page: Number(params.get(PARAM.page) ?? "0"),
    size: Number(params.get(PARAM.size) ?? "50"),
  };
  const media = useQuery(mediaListQuery(filter));

  function update(changes: Record<string, string | null>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (!(PARAM.page in changes)) {
        next.delete(PARAM.page);
      }
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{messages.media.title}</h1>
        <Can permission="media.manage">
          <UploadButton />
        </Can>
      </div>
      <div className="flex gap-2" role="group" aria-label={messages.media.title}>
        <FilterChip selected={!filter.archived} onClick={() => update({ [PARAM.archived]: null })}>
          {messages.media.filters.shown}
        </FilterChip>
        <FilterChip selected={filter.archived} onClick={() => update({ [PARAM.archived]: "1" })}>
          {messages.media.filters.hidden}
        </FilterChip>
      </div>
      <Library
        items={media.data?.content}
        isPending={media.isPending}
        isError={media.isError}
        onRetry={() => void media.refetch()}
        emptyMessage={filter.archived ? messages.media.emptyArchived : messages.media.empty}
      />
      {media.data && media.data.content.length > 0 && (
        <Pager
          pagination={{
            page: filter.page,
            size: filter.size,
            total: media.data.page?.totalElements ?? 0,
            onPageChange: (page) => update({ [PARAM.page]: String(page) }),
            onSizeChange: (size) => update({ [PARAM.size]: String(size) }),
          }}
        />
      )}
    </section>
  );
}

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      size="sm"
      aria-pressed={selected}
      onClick={onClick}
      className="rounded-full"
    >
      {children}
    </Button>
  );
}

function Library({
  items,
  isPending,
  isError,
  onRetry,
  emptyMessage,
}: {
  items: MediaView[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage: string;
}) {
  if (isPending) {
    return (
      <div role="status" aria-label={messages.loading} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <span className="sr-only">{messages.loading}</span>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <p>{messages.common.loadError}</p>
        <Button variant="secondary" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      </Card>
    );
  }
  if (!items || items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }
  return (
    <ul aria-label={messages.media.title} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={`/medya/${item.id}`}
            className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img
              src={item.previewThumbnailUrl}
              alt={item.altText.tr ?? ""}
              loading="lazy"
              width={400}
              height={Math.round((400 * item.height) / item.width)}
              className="aspect-[4/3] w-full bg-muted object-cover"
            />
            <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
              <span className="truncate font-medium" title={item.originalFileName}>
                {item.originalFileName}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {item.width} × {item.height}
              </span>
              {!item.altText.tr && <Badge className="self-start">{messages.media.missingAlt}</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Picks one or more files and uploads them one by one; the server takes one image at a time anyway. */
function UploadButton() {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: File[]) {
    const accepted: File[] = [];
    for (const file of files) {
      const problem = checkBeforeUpload(file);
      if (problem) {
        toast.error(`${file.name}: ${errorText(problem)}`);
      } else {
        accepted.push(file);
      }
    }
    let uploaded = 0;
    for (const [index, file] of accepted.entries()) {
      setProgress({ done: index, total: accepted.length });
      const result = await uploadImage(file);
      if (result.media) {
        uploaded++;
      } else {
        toast.error(`${file.name}: ${errorText(result.error)}`);
      }
    }
    setProgress(null);
    if (uploaded > 0) {
      toast.success(messages.media.uploaded(uploaded));
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        aria-label={messages.media.upload}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />
      <Button onClick={() => input.current?.click()} disabled={progress !== null}>
        <Upload aria-hidden />
        {progress ? messages.media.uploading(progress.done + 1, progress.total) : messages.media.upload}
      </Button>
      <p className={cn("text-xs text-muted-foreground", "max-w-xs text-end")}>{messages.media.hint}</p>
    </div>
  );
}
