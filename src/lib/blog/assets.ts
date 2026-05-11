import fs from "node:fs";
import path from "node:path";

import { buildAbsoluteUrl } from "@/lib/utils/site";

export function hasPublicAsset(src: string) {
  if (!src.startsWith("/")) {
    return false;
  }

  const normalizedPath = src.replace(/^\/+/, "").replace(/\//g, path.sep);
  return fs.existsSync(path.join(process.cwd(), "public", normalizedPath));
}

export function getPublicAssetUrl(src: string) {
  if (!src.startsWith("/")) {
    return undefined;
  }

  return hasPublicAsset(src) ? buildAbsoluteUrl(src) : undefined;
}
