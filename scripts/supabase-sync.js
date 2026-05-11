#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function sanitizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveNextPrefix(migrationsDir) {
  const names = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  let maxPrefix = 0n;
  for (const name of names) {
    const match = /^(\d{14})_.*\.sql$/i.exec(name);
    if (!match) continue;
    const prefix = BigInt(match[1]);
    if (prefix > maxPrefix) maxPrefix = prefix;
  }

  const nowPrefix = BigInt(formatTimestamp(new Date()));
  return nowPrefix > maxPrefix ? nowPrefix : maxPrefix + 1n;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(
      [
        "Uso:",
        "  node scripts/supabase-sync.js [arquivo_sql] [slug] [--dry-run]",
        "",
        "Exemplos:",
        "  node scripts/supabase-sync.js",
        "  node scripts/supabase-sync.js db/policies.sql policies_sync",
        "  node scripts/supabase-sync.js db/policies.sql policies_sync --dry-run",
      ].join("\n")
    );
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => arg !== "--dry-run");

  const sqlArg = positional[0] || "db/policies.sql";
  const slugArg = positional[1] || path.basename(sqlArg, path.extname(sqlArg));
  const slug = sanitizeSlug(slugArg) || "migration";

  const root = process.cwd();
  const sourcePath = path.resolve(root, sqlArg);
  const migrationsDir = path.resolve(root, "supabase", "migrations");
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!fs.existsSync(sourcePath)) {
    console.error(`Arquivo SQL não encontrado: ${sourcePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  if (!dbPassword && !dryRun) {
    console.error(
      "Variável SUPABASE_DB_PASSWORD ausente. Defina antes de rodar."
    );
    process.exit(1);
  }

  const prefix = resolveNextPrefix(migrationsDir).toString();
  if (dryRun) {
    const previewName = `${prefix}_${slug}.sql`;
    console.log(`Dry-run: criaria supabase/migrations/${previewName}`);
    console.log("Dry-run: push remoto não foi executado.");
    process.exit(0);
  }

  const migrationName = `${prefix}_${slug}.sql`;
  const migrationPath = path.join(migrationsDir, migrationName);
  fs.copyFileSync(sourcePath, migrationPath);
  console.log(`Migration criada: supabase/migrations/${migrationName}`);

  console.log("Aplicando no projeto remoto...");

  const push = spawnSync(
    "npx",
    ["--yes", "supabase", "db", "push", "--yes", "--password", dbPassword],
    {
      stdio: "inherit",
      shell: true,
      env: process.env,
    }
  );

  if (push.status !== 0) {
    console.error("Falha no db push. Migration local mantida para revisão.");
    process.exit(push.status || 1);
  }

  console.log("Push remoto concluído.");
}

main();
