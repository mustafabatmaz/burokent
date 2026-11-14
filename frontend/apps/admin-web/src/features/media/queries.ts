import type { AdminComponents } from "@burokent/api-client/admin";
import { queryOptions } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import { unwrap } from "../identity/queries.ts";

export type MediaView = AdminComponents["schemas"]["MediaView"];
export type MediaLocale = "tr" | "en" | "ar";
export const MEDIA_LOCALES: readonly MediaLocale[] = ["tr", "en", "ar"];

/** Same limits as the backend, checked before a file is sent. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface MediaFilter {
  archived: boolean;
  page: number;
  size: number;
}

export const mediaListQuery = (filter: MediaFilter) =>
  queryOptions({
    queryKey: ["media", "list", filter],
    queryFn: async () => unwrap(await api.GET("/api/admin/media", { params: { query: filter } })),
  });

export const mediaQuery = (id: number) =>
  queryOptions({
    queryKey: ["media", id],
    queryFn: async () => unwrap(await api.GET("/api/admin/media/{id}", { params: { path: { id } } })),
  });

/** Sends one file as multipart form data; the error is the problem code to show. */
export async function uploadImage(file: File): Promise<{ media?: MediaView; error?: string }> {
  const { data, error, response } = await api.POST("/api/admin/media", {
    // The generated type says string (binary); the form data carries the File itself
    body: { file: file as unknown as string },
    bodySerializer: () => {
      const form = new FormData();
      form.append("file", file);
      return form;
    },
  });
  if (data) {
    return { media: data };
  }
  // A body over the proxy's limit is refused there, as HTML without a problem code
  if (response.status === 413) {
    return { error: "media_file_too_large" };
  }
  return { error: (error as { code?: string } | undefined)?.code ?? "unexpected" };
}

/** Problems found before uploading, so a big phone photo isn't sent for nothing. */
export function checkBeforeUpload(file: File): string | undefined {
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return "media_type_unsupported";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "media_file_too_large";
  }
  return undefined;
}

export function formatBytes(bytes: number): string {
  const format = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);
  if (bytes >= 1024 * 1024) {
    return `${format(bytes / (1024 * 1024))} MB`;
  }
  return `${format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
