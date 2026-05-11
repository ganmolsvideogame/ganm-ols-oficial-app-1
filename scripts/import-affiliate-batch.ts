import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const [, , inputPathArg] = process.argv;

  if (!inputPathArg) {
    throw new Error("Informe o caminho do arquivo de importacao.");
  }

  const inputPath = path.resolve(inputPathArg);
  const raw = await fs.readFile(inputPath, "utf8");
  const { importAffiliateProductsFromText } = await import("@/lib/affiliate/import");
  const result = await importAffiliateProductsFromText(raw);

  console.log(
    JSON.stringify(
      {
        importedCount: result.importedCount,
        savedCount: result.savedCount,
        errors: result.errors,
        slugs: result.imported.map((item) => item.slug),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
