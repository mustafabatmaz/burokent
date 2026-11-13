import { mkdirSync, writeFileSync } from "node:fs";
import { API_GROUPS, generatedFile, renderTypes } from "./codegen.ts";

for (const group of API_GROUPS) {
  const file = generatedFile(group);
  mkdirSync(new URL(".", file), { recursive: true });
  writeFileSync(file, await renderTypes(group));
  console.log(`wrote ${file.pathname}`);
}
