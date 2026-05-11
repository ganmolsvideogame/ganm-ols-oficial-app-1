import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_PATHS } from "@/lib/config/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play Store Assets | GANM OLS Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams?:
    | Promise<{
        editor?: string;
      }>
    | {
        editor?: string;
      };
};

function AssetHeader({
  title,
  subtitle,
  clean,
}: {
  title: string;
  subtitle: string;
  clean: boolean;
}) {
  if (clean) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
          Recorte
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      </div>
    </div>
  );
}

function PhoneStatusBar() {
  return (
    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-900">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-zinc-900" />
        <span className="h-2 w-2 rounded-full bg-zinc-900/70" />
        <span className="h-2 w-4 rounded-full border border-zinc-900" />
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdmin();
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const editorMode = resolvedSearchParams?.editor === "1";
  const clean = !editorMode;

  return (
    <main className="min-h-screen bg-[#f4efe6] text-zinc-950">
      {editorMode ? (
        <div className="border-b border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Play Store
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
                Assets privados para recorte
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Abra em modo captura para esconder instrucoes e tirar os recortes
                direto da tela.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={ADMIN_PATHS.content}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Voltar ao conteudo
              </Link>
              <Link
                href={ADMIN_PATHS.playAssets}
                className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Abrir modo captura
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`mx-auto w-full ${clean ? "max-w-[1120px] px-6 py-8" : "max-w-7xl px-6 py-10"}`}>
        <section className={clean ? "space-y-10" : "space-y-14"}>
          <div>
            <AssetHeader
              clean={clean}
              title="Recurso grafico 1024 x 500"
              subtitle="Banner principal para a ficha do app no Google Play."
            />
            <div className="mx-auto aspect-[1024/500] w-full max-w-[1024px] overflow-hidden rounded-[36px] bg-white shadow-[0_18px_60px_rgba(24,24,27,0.14)]">
              <div className="relative flex h-full w-full items-stretch bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f8f4ec_44%,_#efe5d5_100%)]">
                <div className="flex w-[57%] flex-col justify-between px-10 py-9">
                  <div>
                    <div className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      G A N M O L S
                    </div>
                    <h2 className="mt-5 max-w-[420px] text-[54px] font-black uppercase leading-[0.92] tracking-[-0.04em] text-zinc-950">
                      Compre, venda e descubra ofertas gamer
                    </h2>
                    <p className="mt-5 max-w-[420px] text-[22px] leading-[1.3] text-zinc-700">
                      Marketplace de videogames com consoles, acessorios,
                      classicos e oportunidades em um so app.
                    </p>
                  </div>

                  <div className="grid max-w-[470px] grid-cols-3 gap-3">
                    {[
                      "Ofertas e favoritos",
                      "Produtos e detalhes",
                      "Vitrine para vendedores",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[20px] border border-zinc-200/80 bg-white/85 px-4 py-4 text-[14px] font-semibold text-zinc-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative flex w-[43%] items-end justify-end overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent to-[#f2e9da]" />
                  <div className="absolute right-8 top-10 h-16 w-16 rounded-3xl bg-zinc-950/6" />
                  <div className="absolute right-28 top-24 h-10 w-10 rounded-full bg-zinc-950/8" />

                  <div className="relative mr-10 h-[410px] w-[210px] overflow-hidden rounded-[34px] border border-zinc-300/80 bg-zinc-950 shadow-[0_24px_80px_rgba(24,24,27,0.22)]">
                    <div className="absolute inset-x-0 top-0 h-8 bg-zinc-950" />
                    <div className="absolute left-1/2 top-2 h-2 w-16 -translate-x-1/2 rounded-full bg-zinc-700" />
                    <div className="absolute inset-[8px] rounded-[28px] bg-[linear-gradient(180deg,_#f7f2e9_0%,_#ffffff_45%,_#f5efe3_100%)] px-4 py-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                            GANM OLS
                          </p>
                          <p className="mt-1 text-[18px] font-bold text-zinc-950">
                            Videogames
                          </p>
                        </div>
                        <Image
                          src="/google-play-icon-512-final.png"
                          alt="GANM OLS"
                          width={54}
                          height={54}
                          className="h-[54px] w-[54px] rounded-[16px]"
                        />
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          "Switch 2 e acessorios",
                          "Classicos Nintendo e PlayStation",
                          "Anuncie e monte sua vitrine",
                        ].map((item, index) => (
                          <div
                            key={item}
                            className={`rounded-[20px] px-4 py-3 ${
                              index === 0
                                ? "bg-zinc-950 text-white"
                                : "border border-zinc-200 bg-white text-zinc-900"
                            }`}
                          >
                            <p className="text-[13px] font-semibold">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <AssetHeader
              clean={clean}
              title="Capturas de tela para telefone"
              subtitle="Blocos prontos em proporcao 9:16 para recortar e usar na ficha do app."
            />

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
              <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[38px] border border-zinc-200 bg-white p-4 shadow-[0_18px_60px_rgba(24,24,27,0.14)]">
                <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,_#faf6ee_0%,_#ffffff_42%,_#f7f0e4_100%)] p-4">
                  <PhoneStatusBar />
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Home
                      </p>
                      <h3 className="mt-1 text-[24px] font-black leading-none text-zinc-950">
                        Ofertas gamer em um so lugar
                      </h3>
                    </div>
                    <Image
                      src="/google-play-icon-512-final.png"
                      alt="GANM OLS"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-2xl"
                    />
                  </div>

                  <div className="mt-5 rounded-[28px] bg-zinc-950 p-5 text-white">
                    <p className="text-[13px] uppercase tracking-[0.2em] text-white/70">
                      Destaque
                    </p>
                    <p className="mt-2 text-[27px] font-black uppercase leading-[0.92]">
                      Descubra consoles, acessorios e classicos
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {["Ofertas", "Favoritos", "Lances", "Vender"].map((item) => (
                      <div
                        key={item}
                        className="rounded-[22px] border border-zinc-200 bg-white px-4 py-4"
                      >
                        <p className="text-[14px] font-semibold text-zinc-900">{item}</p>
                        <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                          Navegacao rapida e foco no que importa.
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto rounded-[24px] border border-zinc-200 bg-white px-4 py-4">
                    <p className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">
                      Para quem compra e vende
                    </p>
                    <p className="mt-2 text-[18px] font-bold leading-tight text-zinc-950">
                      Encontre oportunidades e coloque sua vitrine no ar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[38px] border border-zinc-200 bg-white p-4 shadow-[0_18px_60px_rgba(24,24,27,0.14)]">
                <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,_#ffffff_0%,_#faf6ee_100%)] p-4">
                  <PhoneStatusBar />
                  <div className="mt-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Produto
                    </p>
                    <h3 className="mt-1 text-[24px] font-black leading-none text-zinc-950">
                      Veja fotos, detalhes e escolha com mais clareza
                    </h3>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-zinc-200 bg-[#f5f1e8] p-5">
                    <div className="aspect-square rounded-[24px] bg-white" />
                    <p className="mt-4 text-[19px] font-bold leading-tight text-zinc-950">
                      Nintendo Switch 2 com visual moderno e vitrine organizada
                    </p>
                    <p className="mt-2 text-[15px] text-zinc-600">
                      Compare opcoes, abra a galeria e acompanhe ofertas do jeito
                      certo.
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-[22px] bg-zinc-950 px-4 py-4 text-white">
                      <p className="text-[16px] font-semibold">Comprar agora</p>
                    </div>
                    <div className="rounded-[22px] border border-zinc-200 bg-white px-4 py-4">
                      <p className="text-[16px] font-semibold text-zinc-900">
                        Adicionar aos favoritos
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto rounded-[24px] border border-zinc-200 bg-white px-4 py-4">
                    <p className="text-[18px] font-bold leading-tight text-zinc-950">
                      Explore recomendacoes e complete seu setup.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[38px] border border-zinc-200 bg-white p-4 shadow-[0_18px_60px_rgba(24,24,27,0.14)]">
                <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,_#faf6ee_0%,_#fffdfa_100%)] p-4">
                  <PhoneStatusBar />
                  <div className="mt-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Favoritos e alertas
                    </p>
                    <h3 className="mt-1 text-[24px] font-black leading-none text-zinc-950">
                      Salve produtos e acompanhe novas oportunidades
                    </h3>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Nintendo Switch Pro Controller",
                      "PS2 Slim com 2 controles",
                      "Mega Drive 2 original",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-[24px] px-4 py-4 ${
                          index === 0
                            ? "bg-zinc-950 text-white"
                            : "border border-zinc-200 bg-white text-zinc-900"
                        }`}
                      >
                        <p className="text-[16px] font-semibold">{item}</p>
                        <p className={`mt-1 text-[12px] ${index === 0 ? "text-white/70" : "text-zinc-500"}`}>
                          Receba alertas, volte depois e acompanhe os itens do seu interesse.
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto rounded-[24px] border border-zinc-200 bg-white px-4 py-4">
                    <p className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">
                      App e navegador
                    </p>
                    <p className="mt-2 text-[18px] font-bold leading-tight text-zinc-950">
                      Continue acompanhando ofertas e novidades sem perder o timing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[38px] border border-zinc-200 bg-white p-4 shadow-[0_18px_60px_rgba(24,24,27,0.14)]">
                <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,_#ffffff_0%,_#f6efe3_100%)] p-4">
                  <PhoneStatusBar />
                  <div className="mt-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Vendedores
                    </p>
                    <h3 className="mt-1 text-[24px] font-black leading-none text-zinc-950">
                      Crie sua conta e monte sua vitrine gamer
                    </h3>
                  </div>

                  <div className="mt-5 rounded-[26px] bg-zinc-950 p-5 text-white">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-white/70">
                      Grupo exclusivo para vendedores
                    </p>
                    <p className="mt-3 text-[24px] font-black uppercase leading-[0.96]">
                      Entre, anuncie e acompanhe oportunidades
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      "Cadastro rapido",
                      "Painel de vendas",
                      "Pedidos e pagamentos",
                      "Campanhas e visibilidade",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[22px] border border-zinc-200 bg-white px-4 py-4"
                      >
                        <p className="text-[15px] font-semibold text-zinc-900">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto rounded-[24px] border border-zinc-200 bg-white px-4 py-4">
                    <p className="text-[18px] font-bold leading-tight text-zinc-950">
                      Publique seus produtos e acompanhe tudo pelo app.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
