import openapiTS, { astToString } from "openapi-typescript";

export const API_GROUPS = ["public", "admin"] as const;
export type ApiGroup = (typeof API_GROUPS)[number];

export function specFile(group: ApiGroup): URL {
  return new URL(`../openapi/${group}.json`, import.meta.url);
}

export function generatedFile(group: ApiGroup): URL {
  return new URL(`../src/generated/${group}.ts`, import.meta.url);
}

/** TypeScript types for one API group, generated from the spec the backend writes into openapi/. */
export async function renderTypes(group: ApiGroup): Promise<string> {
  const header = `// Generated from openapi/${group}.json. Do not edit: run \`pnpm generate:api\`.\n\n`;
  return header + astToString(await openapiTS(specFile(group)));
}
