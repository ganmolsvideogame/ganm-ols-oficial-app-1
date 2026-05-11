import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type CheckResult = {
  ok: boolean;
  label: string;
  details?: string;
};

const projectRoot = process.cwd();
const googleServicesPath = path.join(
  projectRoot,
  "android",
  "app",
  "google-services.json"
);

function readEnvFile(relativePath: string) {
  const filePath = path.join(projectRoot, relativePath);
  if (!existsSync(filePath)) {
    return "";
  }

  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function hasEnvValue(source: string, key: string) {
  return new RegExp(`^\\s*${key}\\s*=`, "m").test(source);
}

function runChecks() {
  const envLocal = readEnvFile(".env.local");
  const envVercel = readEnvFile(".env.vercel.production");
  const combinedEnv = `${envLocal}\n${envVercel}`;

  const checks: CheckResult[] = [
    {
      ok: existsSync(googleServicesPath),
      label: "Arquivo android/app/google-services.json",
      details: googleServicesPath,
    },
    {
      ok: hasEnvValue(combinedEnv, "FIREBASE_PROJECT_ID"),
      label: "Env FIREBASE_PROJECT_ID",
    },
    {
      ok: hasEnvValue(combinedEnv, "FIREBASE_CLIENT_EMAIL"),
      label: "Env FIREBASE_CLIENT_EMAIL",
    },
    {
      ok: hasEnvValue(combinedEnv, "FIREBASE_PRIVATE_KEY"),
      label: "Env FIREBASE_PRIVATE_KEY",
    },
    {
      ok: hasEnvValue(combinedEnv, "FIREBASE_SERVICE_ACCOUNT_JSON"),
      label: "Env FIREBASE_SERVICE_ACCOUNT_JSON",
    },
  ];

  const hasInlineServiceAccount =
    checks.find((item) => item.label === "Env FIREBASE_SERVICE_ACCOUNT_JSON")
      ?.ok === true;
  const hasSplitServiceAccount =
    checks.find((item) => item.label === "Env FIREBASE_PROJECT_ID")?.ok ===
      true &&
    checks.find((item) => item.label === "Env FIREBASE_CLIENT_EMAIL")?.ok ===
      true &&
    checks.find((item) => item.label === "Env FIREBASE_PRIVATE_KEY")?.ok ===
      true;

  console.log("\nPush Android - diagnostico");
  console.log("--------------------------");

  for (const check of checks) {
    console.log(`${check.ok ? "[OK]" : "[FALTA]"} ${check.label}`);
    if (check.details) {
      console.log(`        ${check.details}`);
    }
  }

  console.log("\nResultado:");

  if (!existsSync(googleServicesPath)) {
    console.log(
      "- O app Android ainda nao consegue registrar token FCM. Coloque o google-services.json em android/app/."
    );
  }

  if (!hasInlineServiceAccount && !hasSplitServiceAccount) {
    console.log(
      "- O servidor ainda nao consegue enviar push nativo. Configure FIREBASE_SERVICE_ACCOUNT_JSON ou o trio FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY."
    );
  }

  if (existsSync(googleServicesPath) && (hasInlineServiceAccount || hasSplitServiceAccount)) {
    console.log(
      "- Estrutura minima de push nativo encontrada. Proximo passo: fazer deploy do servidor e gerar uma nova build Android."
    );
  }

  console.log("");
}

runChecks();
