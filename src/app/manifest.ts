import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GANM OLS",
    short_name: "GANM OLS",
    description: "Marketplace e blog gamer para consoles, jogos e colecionaveis.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#111111",
    lang: "pt-BR",
    categories: ["shopping", "entertainment", "games"],
    icons: [
      {
        src: "/pwa/ganmols-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa/ganmols-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa/ganmols-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Blog",
        short_name: "Blog",
        description: "Leia os artigos da GANM OLS",
        url: "/blog",
      },
      {
        name: "Categorias",
        short_name: "Categorias",
        description: "Explore categorias e vitrines",
        url: "/categorias",
      },
      {
        name: "Lojas",
        short_name: "Lojas",
        description: "Visite as lojas da GANM OLS",
        url: "/lojas",
      },
    ],
  };
}
