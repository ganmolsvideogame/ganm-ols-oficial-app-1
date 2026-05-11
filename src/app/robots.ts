import type { MetadataRoute } from "next";

import { buildAbsoluteUrl } from "@/lib/utils/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/vender/comece", "/vender/planos"],
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/carrinho",
          "/checkout",
          "/compras",
          "/conta",
          "/entrar",
          "/favoritos",
          "/notificacoes",
          "/painel-ganm-ols",
          "/vender",
        ],
      },
    ],
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
  };
}
