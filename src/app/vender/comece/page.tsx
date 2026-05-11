import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import InstallAppButton from "@/components/pwa/InstallAppButton";
import SellerBroadcastChannelCard from "@/components/seller/SellerBroadcastChannelCard";
import {
  BUYER_APPROVAL_DAYS,
  MARKETPLACE_FEE_PERCENT,
} from "@/lib/config/commerce";

function buildStartHref() {
  return `/entrar?redirect_to=${encodeURIComponent("/vender")}`;
}

function reveal(delay = 0): CSSProperties {
  return {
    animation: "fade-up .75s ease-out both",
    animationDelay: `${delay}s`,
  };
}

function floating(delay = 0, duration = "7.6s"): CSSProperties {
  return {
    animation: `seller-float ${duration} ease-in-out infinite`,
    animationDelay: `${delay}s`,
  };
}

function glow(delay = 0): CSSProperties {
  return {
    animation: "seller-glow 4.8s ease-in-out infinite",
    animationDelay: `${delay}s`,
  };
}

type FeatureArtKind =
  | "audiencia"
  | "checkout"
  | "envio"
  | "automacao"
  | "loja"
  | "crescimento";

function SectionIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind:
    | "graph"
    | "shield"
    | "spark"
    | "card"
    | "truck"
    | "bell"
    | "wallet"
    | "box";
  className?: string;
}) {
  switch (kind) {
    case "graph":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M4 18h16M7 15l3-4 3 2 4-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="15" r="1.2" fill="currentColor" />
          <circle cx="10" cy="11" r="1.2" fill="currentColor" />
          <circle cx="13" cy="13" r="1.2" fill="currentColor" />
          <circle cx="17" cy="8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M12 3l7 3v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 12.4l1.7 1.7 3.5-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "card":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect
            x="3.5"
            y="5.5"
            width="17"
            height="13"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.5 15h3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M3.5 6.5h10v8h-10zM13.5 9.5h3l2 2v3h-5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M6 16.5h12l-1.7-2.2V10a4.3 4.3 0 10-8.6 0v4.3L6 16.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.5a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M5 7.5h12a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-9z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M5 7.5V7A2.5 2.5 0 017.5 4.5H17"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15 12h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M12 3l7 3.8v10.4L12 21l-7-3.8V6.8L12 3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M5.3 7.1L12 11l6.7-3.9M12 11v10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function FeatureIllustration({ kind }: { kind: FeatureArtKind }) {
  if (kind === "audiencia") {
    return (
      <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
        <rect x="18" y="18" width="184" height="104" rx="22" fill="#f5f5f5" />
        <circle cx="70" cy="66" r="18" fill="#18181b" opacity="0.9" />
        <circle cx="114" cy="54" r="12" fill="#27272a" opacity="0.8" />
        <circle cx="148" cy="73" r="15" fill="#3f3f46" opacity="0.9" />
        <path
          d="M52 97c4-13 13-20 27-20s23 7 27 20"
          stroke="#18181b"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M104 83c2.5-8.5 8.3-13 17.6-13 9.3 0 15.1 4.5 17.6 13"
          stroke="#52525b"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M133 99c3-10 10-15 21-15s18 5 21 15"
          stroke="#a1a1aa"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x="36" y="27" width="54" height="10" rx="5" fill="#ffffff" />
      </svg>
    );
  }

  if (kind === "checkout") {
    return (
      <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
        <rect x="24" y="20" width="172" height="100" rx="24" fill="#f5f5f5" />
        <rect x="46" y="42" width="86" height="54" rx="12" fill="#18181b" />
        <rect x="60" y="56" width="58" height="8" rx="4" fill="#ffffff" opacity="0.95" />
        <rect x="60" y="70" width="34" height="8" rx="4" fill="#ffffff" opacity="0.5" />
        <rect x="140" y="52" width="34" height="34" rx="17" fill="#ffffff" />
        <path
          d="M158 62v12M152 68h12"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M152 98h26"
          stroke="#a1a1aa"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "envio") {
    return (
      <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
        <rect x="18" y="18" width="184" height="104" rx="22" fill="#f5f5f5" />
        <path
          d="M44 85h82"
          stroke="#18181b"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M126 56h27l18 20v9h-45z"
          stroke="#18181b"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <rect x="52" y="44" width="56" height="34" rx="8" fill="#18181b" />
        <rect x="61" y="52" width="38" height="18" rx="4" fill="#ffffff" opacity="0.9" />
        <circle cx="75" cy="94" r="11" fill="#ffffff" stroke="#18181b" strokeWidth="6" />
        <circle cx="150" cy="94" r="11" fill="#ffffff" stroke="#18181b" strokeWidth="6" />
      </svg>
    );
  }

  if (kind === "automacao") {
    return (
      <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
        <rect x="22" y="18" width="176" height="104" rx="22" fill="#f5f5f5" />
        <rect x="42" y="34" width="44" height="32" rx="10" fill="#18181b" />
        <rect x="98" y="28" width="82" height="18" rx="9" fill="#ffffff" />
        <rect x="98" y="54" width="58" height="14" rx="7" fill="#d4d4d8" />
        <rect x="42" y="80" width="54" height="18" rx="9" fill="#ffffff" />
        <rect x="106" y="80" width="74" height="18" rx="9" fill="#18181b" opacity="0.86" />
        <path
          d="M74 50h18l10-11h12M69 89h24l13-16h16"
          stroke="#18181b"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="103" cy="39" r="5" fill="#18181b" />
        <circle cx="106" cy="73" r="5" fill="#18181b" />
      </svg>
    );
  }

  if (kind === "loja") {
    return (
      <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
        <rect x="18" y="18" width="184" height="104" rx="22" fill="#f5f5f5" />
        <path
          d="M48 51l8-17h108l8 17"
          stroke="#18181b"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M52 53h116v48H52z"
          fill="#ffffff"
          stroke="#18181b"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M82 101V72h34v29"
          stroke="#18181b"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <rect x="128" y="66" width="20" height="15" rx="4" fill="#18181b" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 140" className="h-32 w-full" fill="none">
      <rect x="18" y="18" width="184" height="104" rx="22" fill="#f5f5f5" />
      <path
        d="M50 91l26-28 24 18 34-34 34 18"
        stroke="#18181b"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="76" cy="63" r="10" fill="#18181b" />
      <circle cx="134" cy="47" r="10" fill="#18181b" opacity="0.8" />
      <circle cx="168" cy="65" r="10" fill="#18181b" opacity="0.55" />
      <rect x="42" y="34" width="68" height="10" rx="5" fill="#ffffff" />
    </svg>
  );
}

function HeroSceneIllustration() {
  return (
    <svg viewBox="0 0 560 470" className="w-full" fill="none">
      <rect x="48" y="54" width="368" height="246" rx="30" fill="#ffffff" />
      <rect x="70" y="80" width="324" height="18" rx="9" fill="#f4f4f5" />
      <rect x="70" y="114" width="172" height="118" rx="24" fill="#18181b" />
      <rect x="90" y="136" width="82" height="14" rx="7" fill="#ffffff" opacity="0.95" />
      <rect x="90" y="160" width="112" height="10" rx="5" fill="#ffffff" opacity="0.48" />
      <path
        d="M90 196h132"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M96 211l22-20 28 12 34-35 32 21"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="258" y="114" width="116" height="74" rx="22" fill="#f4f4f5" />
      <rect x="277" y="132" width="76" height="10" rx="5" fill="#18181b" />
      <rect x="277" y="153" width="52" height="9" rx="4.5" fill="#a1a1aa" />
      <rect x="258" y="202" width="116" height="30" rx="15" fill="#18181b" />
      <rect x="283" y="213" width="66" height="8" rx="4" fill="#ffffff" />
      <rect x="126" y="326" width="240" height="28" rx="14" fill="#ffffff" opacity="0.9" />
      <rect x="172" y="352" width="150" height="18" rx="9" fill="#facc15" />

      <path
        d="M420 124l56-18 38 76-56 18z"
        fill="#18181b"
        opacity="0.94"
      />
      <rect x="438" y="144" width="38" height="12" rx="6" fill="#ffffff" opacity="0.95" />
      <rect x="430" y="230" width="72" height="96" rx="18" fill="#ffffff" />
      <path d="M446 247h40v24h-40z" fill="#18181b" opacity="0.92" />
      <rect x="443" y="281" width="46" height="9" rx="4.5" fill="#d4d4d8" />
      <rect x="443" y="297" width="34" height="9" rx="4.5" fill="#d4d4d8" />

      <rect x="58" y="322" width="58" height="58" rx="18" fill="#18181b" />
      <path
        d="M87 338l16 9v18l-16 9-16-9v-18l16-9z"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      <circle cx="470" cy="74" r="30" fill="#ffffff" />
      <path
        d="M459 74l8 8 14-18"
        stroke="#18181b"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FloatingCard({
  title,
  value,
  icon,
  className,
  style,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,.28)] backdrop-blur ${className}`}
      style={style}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/12 p-2 text-white">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            {title}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-static";

export default function Page() {
  const startHref = buildStartHref();

  const quickWins = [
    {
      title: "Publique hoje",
      value: "Abra sua vitrine e coloque o primeiro anuncio no ar em poucos minutos.",
      icon: <SectionIcon kind="spark" />,
    },
    {
      title: "Taxa simples",
      value: `${MARKETPLACE_FEE_PERCENT}% por venda aprovada, sem mensalidade para comecar.`,
      icon: <SectionIcon kind="wallet" />,
    },
    {
      title: "Venda com seguranca",
      value: "Checkout protegido para gerar mais confianca e reduzir atrito na hora da compra.",
      icon: <SectionIcon kind="shield" />,
    },
    {
      title: "Poste sem enrolacao",
      value: "Pagamento aprovado libera etiqueta, rastreio e o proximo passo da venda.",
      icon: <SectionIcon kind="truck" />,
    },
  ];

  const featureCards = [
    {
      title: "Apareca para quem ja procura itens gamer",
      desc: "Seu anuncio entra em um marketplace pensado para consoles, jogos, acessorios e colecionaveis.",
      bullets: [
        "Categorias prontas para vender melhor",
        "Catalogo com foco em gamer e retro",
        "Vitrine mais alinhada com o comprador certo",
      ],
      art: <FeatureIllustration kind="audiencia" />,
    },
    {
      title: "Converta interesse em pedido aprovado",
      desc: "O comprador ve detalhes claros, conclui o pagamento e acompanha o pedido sem sair do fluxo.",
      bullets: [
        "Compra protegida para gerar confianca",
        "Pagamento aprovado em tempo real",
        "Mais clareza na jornada de compra",
      ],
      art: <FeatureIllustration kind="checkout" />,
    },
    {
      title: "Envie rapido quando a venda cair",
      desc: "Etiqueta, rastreio e informacoes do pedido ficam organizados para voce postar no prazo.",
      bullets: [
        "Etiqueta liberada apos aprovacao",
        "Historico de envio no pedido",
        "Menos troca manual para postar",
      ],
      art: <FeatureIllustration kind="envio" />,
    },
    {
      title: "Recupere vendas que quase escapam",
      desc: "Automacoes e avisos ajudam voce a nao perder oportunidades por demora ou silencio.",
      bullets: [
        "Recuperacao de carrinho abandonado",
        "Avisos de compra e pagamento",
        "Mensagens e acompanhamento no pos-venda",
      ],
      art: <FeatureIllustration kind="automacao" />,
    },
  ];

  const growthCards = [
    {
      title: "Seu catalogo entra mais competitivo",
      desc: "Painel com anuncios, pedidos e etapas claras para publicar melhor e vender com mais consistencia.",
      art: <FeatureIllustration kind="loja" />,
    },
    {
      title: "Cada pedido empurra a proxima venda",
      desc: "Aprovou, postou e entregou? O fluxo segue claro para voce repetir o processo com mais velocidade.",
      art: <FeatureIllustration kind="crescimento" />,
    },
  ];

  const automationSteps = [
    {
      step: "01",
      title: "Entre no ar com anuncio forte",
      desc: "Publique com titulo, preco, fotos e detalhes que ajudam seu produto a chamar atencao.",
      icon: "box" as const,
    },
    {
      step: "02",
      title: "Transforme clique em compra",
      desc: "Quando o comprador fecha o pedido, a plataforma atualiza o status e acelera sua proxima acao.",
      icon: "card" as const,
    },
    {
      step: "03",
      title: "Poste com mais velocidade",
      desc: "Frete habilitado vira etiqueta e rastreio para voce despachar rapido e manter a venda rodando.",
      icon: "truck" as const,
    },
    {
      step: "04",
      title: "Receba e siga vendendo",
      desc: `Depois da entrega e da janela de garantia de ${BUYER_APPROVAL_DAYS} dias, o pedido entra no fluxo de repasse.`,
      icon: "wallet" as const,
    },
  ];

  const faqItems = [
    {
      q: "Preciso pagar para anunciar?",
      a: `Voce pode entrar e publicar. A GANM OLS cobra ${MARKETPLACE_FEE_PERCENT}% por pedido aprovado, sem mensalidade para comecar.`,
    },
    {
      q: "Quando recebo o dinheiro?",
      a: `Depois da entrega e do periodo de garantia do comprador de ${BUYER_APPROVAL_DAYS} dias, o pedido entra no fluxo de repasse do vendedor.`,
    },
    {
      q: "Como funciona a etiqueta?",
      a: "Se o anuncio estiver com envio habilitado, a plataforma libera etiqueta e rastreio depois da aprovacao do pagamento.",
    },
    {
      q: "Ja tenho conta. Preciso criar outra?",
      a: "Nao. Basta entrar no seu perfil atual e ativar o modo vendedor no painel.",
    },
  ];

  return (
    <div className="space-y-16 pb-8 md:space-y-20">
      <section className="relative isolate overflow-hidden rounded-[2.2rem] border border-zinc-200 bg-zinc-950 px-6 py-8 text-white shadow-[0_30px_120px_rgba(0,0,0,.16)] md:px-9 md:py-10 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.18),rgba(255,255,255,0)_72%)] blur-2xl"
            style={glow()}
          />
          <div
            className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.15),rgba(255,255,255,0)_70%)] blur-2xl"
            style={glow(0.4)}
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.06),rgba(255,255,255,0)_28%,rgba(255,255,255,.04)_62%,rgba(255,255,255,0))]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:28px_28px]" />
        </div>

        <div className="relative grid gap-10 xl:grid-cols-[1.04fr_.96fr] xl:items-center">
          <div className="space-y-7">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75"
              style={reveal(0.05)}
            >
              Venda mais na GANM OLS
              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              GANM OLS
            </div>

            <div className="space-y-4" style={reveal(0.12)}>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.9rem]">
                Transforme seu estoque em vendas com uma vitrine pronta para
                atrair, converter e acompanhar pedidos.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/72 md:text-lg">
                Publique seus produtos gamer, apareca para compradores mais
                qualificados e cuide da venda em um painel que vai do anuncio ao
                envio.
              </p>
            </div>

            <div
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              style={reveal(0.2)}
            >
              <Link
                href={startHref}
                className="inline-flex w-full min-w-[190px] items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-[0_18px_48px_rgba(255,255,255,.18)] transition hover:bg-zinc-100 sm:w-auto"
              >
                Quero vender agora
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 py-3.5 text-sm font-semibold text-white/88 transition hover:bg-white/10 sm:w-auto"
              >
                Ver como funciona
              </Link>
              <InstallAppButton
                source="seller-landing-hero"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 py-3.5 text-sm font-semibold text-white/88 transition hover:bg-white/10 sm:w-auto"
              />
              <Link
                href="/vender"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 py-3.5 text-sm font-semibold text-white/88 transition hover:bg-white/10 sm:w-auto"
              >
                Abrir painel
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3" style={reveal(0.28)}>
              {[
                {
                  label: "Mais venda",
                  value: "anuncio, pedido e envio no mesmo fluxo",
                },
                {
                  label: "Mais retomada",
                  value: "avisos para nao perder oportunidade",
                },
                {
                  label: "Mais controle",
                  value: "painel vendedor e pedidos em um lugar",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-white/12 bg-white/6 px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/90">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58"
              style={reveal(0.36)}
            >
              {[
                "Mercado Pago",
                "Moderacao",
                "Etiqueta pronta",
                "Rastreio",
                "Notificacoes",
              ].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative" style={reveal(0.16)}>
            <div className="relative mx-auto max-w-[590px] rounded-[2rem] border border-white/12 bg-white/6 p-4 shadow-[0_30px_100px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-5">
              <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))] p-4 md:p-5">
                <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/48">
                      Preview da sua vitrine
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      Publicacao, compra e envio no mesmo fluxo
                    </p>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-[11px] font-semibold text-white/78">
                    pronto para vender
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,#2a2a2f,#111115)] px-3 py-4 md:px-4">
                  <HeroSceneIllustration />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
                  {[
                    "Pedido aprovado",
                    "Etiqueta pronta",
                    "Avisos de venda",
                    "Painel vendedor",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-sm font-medium text-white/88"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <FloatingCard
                title="pagamento"
                value="Comprador concluiu o pagamento"
                icon={<SectionIcon kind="card" className="h-5 w-5" />}
                className="left-[-10px] top-6 hidden w-[210px] sm:block lg:left-[-28px]"
                style={floating(-1.4)}
              />
              <FloatingCard
                title="envio"
                value="Etiqueta pronta para postagem"
                icon={<SectionIcon kind="truck" className="h-5 w-5" />}
                className="right-[-8px] top-20 hidden w-[220px] sm:block lg:right-[-26px]"
                style={floating(-3.2, "8.3s")}
              />
              <FloatingCard
                title="automacao"
                value="Carrinho e avisos empurrando conversao"
                icon={<SectionIcon kind="bell" className="h-5 w-5" />}
                className="bottom-16 left-3 hidden w-[230px] sm:block lg:left-[-18px]"
                style={floating(-5.3, "7.2s")}
              />
              <FloatingCard
                title="crescimento"
                value="Painel pronto para repetir e escalar"
                icon={<SectionIcon kind="graph" className="h-5 w-5" />}
                className="bottom-2 right-2 hidden w-[210px] sm:block lg:right-[-12px]"
                style={floating(-2.1, "8.7s")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-4 grid gap-4 md:-mt-8 md:grid-cols-2 xl:grid-cols-4">
        {quickWins.map((item, index) => (
          <div
            key={item.title}
            className="rounded-[1.8rem] border border-zinc-200 bg-white px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,.06)]"
            style={reveal(0.08 + index * 0.06)}
          >
            <div className="inline-flex rounded-2xl bg-zinc-950 p-2.5 text-white">
              {item.icon}
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
        <div className="space-y-5 lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Venda com mais chance de conversao
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl">
              Entre mais forte desde o primeiro anuncio.
            </h2>
            <p className="max-w-xl text-base leading-7 text-zinc-600">
              Anuncie com contexto certo, destaque melhor seu produto e acompanhe
              cada compra sem perder tempo nem timing.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              O que ajuda voce a vender
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Seu anuncio entra no ar com imagens e detalhes claros.",
                "A compra aprovada vira acao imediata no pedido.",
                "Etiqueta e rastreio entram no fluxo sem improviso.",
                "Comprador acompanha tudo e voce vende com mais confianca.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="mt-1 rounded-full bg-zinc-950 p-1 text-white">
                    <SectionIcon kind="spark" className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm leading-6 text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={startHref}
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Criar conta
              </Link>
              <InstallAppButton
                source="seller-landing-benefits"
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              />
            </div>
            <SellerBroadcastChannelCard
              compact
              className="mt-5"
              description="Entre no canal para receber avisos, novidades e oportunidades pensadas para vendedores da GANM OLS."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {featureCards.map((item, index) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,.06)]"
              style={reveal(0.08 + index * 0.07)}
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-3">
                {item.art}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.desc}</p>
              <div className="mt-4 space-y-2">
                {item.bullets.map((bullet) => (
                  <div key={bullet} className="flex gap-3">
                    <div className="mt-1 rounded-full bg-zinc-950 p-1 text-white">
                      <SectionIcon kind="spark" className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-zinc-700">{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="como-funciona"
        className="relative overflow-hidden rounded-[2.2rem] border border-zinc-200 bg-zinc-950 px-6 py-8 text-white shadow-[0_28px_90px_rgba(0,0,0,.14)] md:px-9 md:py-10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.18),rgba(255,255,255,0)_72%)] blur-2xl" />
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
              Da publicacao ao repasse
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              Um caminho mais rapido entre o clique do comprador e o dinheiro no seu painel.
            </h2>
            <p className="text-base leading-7 text-white/70">
              A jornada foi desenhada para vender com menos atrito: anuncio,
              pagamento, envio e acompanhamento seguem em sequencia clara.
            </p>
          </div>

          <div className="rounded-full border border-white/12 bg-white/7 px-4 py-2 text-sm font-medium text-white/74">
            Menos friccao, mais venda rodada
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 lg:grid-cols-4">
          {automationSteps.map((item, index) => (
            <div
              key={item.step}
              className="relative rounded-[1.8rem] border border-white/12 bg-white/7 p-5 backdrop-blur"
              style={reveal(0.06 + index * 0.06)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-white/12 p-3 text-white">
                  <SectionIcon kind={item.icon} className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/68">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {growthCards.map((item, index) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,.05)]"
              style={reveal(0.08 + index * 0.07)}
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-3">
                {item.art}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <div
          className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 shadow-sm"
          style={reveal(0.1)}
        >
          <div className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Mais resultado por venda
          </div>
          <div className="mt-5 space-y-3">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950">
              Vender melhor fica mais simples quando cada etapa acompanha voce.
            </h2>
            <p className="text-base leading-7 text-zinc-600">
              Voce nao depende de planilha, conversa solta e improviso para
              fechar, postar e acompanhar cada pedido.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {[
              {
                label: "Mais confianca na compra",
                value: "O pedido muda de etapa e o comprador entende o andamento.",
              },
              {
                label: "Mais retomada de interesse",
                value: "Fluxos de email e notificacao para compra, etiqueta, rastreio e carrinho.",
              },
              {
                label: "Mais repeticao de vendas",
                value: "Painel vendedor e jornadas mais claras para publicar de novo e escalar.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-4"
              >
                <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] bg-zinc-950 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52">
              Comissao e repasse
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {MARKETPLACE_FEE_PERCENT}% por venda
            </p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              O repasse e liberado apos a confirmacao da entrega e o periodo de
              garantia do comprador de {BUYER_APPROVAL_DAYS} dias.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={startHref}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Ativar perfil vendedor
              </Link>
              <InstallAppButton
                source="seller-landing-payout"
                className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/4 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Duvidas que travam a entrada
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl">
            As respostas que ajudam o vendedor a entrar agora.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            O objetivo aqui e tirar a duvida que normalmente atrasa a decisao:
            taxa, repasse, envio e ativacao do perfil vendedor.
          </p>
        </div>

        <div className="grid gap-3">
          {faqItems.map((item, index) => (
            <details
              key={item.q}
              className="group rounded-[1.7rem] border border-zinc-200 bg-white px-5 py-5 shadow-sm"
              style={reveal(0.04 + index * 0.05)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5">
                <span className="text-base font-semibold text-zinc-950">
                  {item.q}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-lg font-semibold text-zinc-700 transition group-open:bg-zinc-950 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[2.2rem] border border-zinc-200 bg-[linear-gradient(180deg,#ffffff,#f7f7f8)] px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,.05)] md:px-10 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Comece agora
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl">
              Se voce quer vender agora, o proximo passo e entrar no painel e
              publicar o primeiro anuncio.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-zinc-600">
              Crie sua conta, ative o perfil vendedor e coloque seus produtos no
              ar com um fluxo pronto para atrair, converter e acompanhar pedidos.
            </p>
            <SellerBroadcastChannelCard
              compact
              className="max-w-2xl"
              description="Use o grupo exclusivo para vendedores para acompanhar avisos, oportunidades e novidades do painel."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={startHref}
              className="rounded-[1.8rem] bg-zinc-950 px-6 py-6 text-white shadow-[0_20px_50px_rgba(24,24,27,.18)] transition hover:bg-zinc-800"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
                Comece hoje
              </p>
              <p className="mt-3 text-2xl font-semibold">Quero vender agora</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Entre, ative seu perfil e publique o primeiro produto.
              </p>
            </Link>

            <Link
              href="/vender"
              className="rounded-[1.8rem] border border-zinc-200 bg-white px-6 py-6 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Ja tenho conta
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-950">
                Abrir painel vendedor
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Se voce ja esta cadastrado, entre direto no painel e continue vendendo.
              </p>
            </Link>

            <InstallAppButton
              source="seller-landing-final"
              className="rounded-[1.8rem] border border-zinc-200 bg-white px-6 py-6 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                No celular
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-950">
                Instalar app
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Abrir a GANM OLS com atalho na tela e entrar mais rapido no painel vendedor.
              </p>
            </InstallAppButton>
          </div>
        </div>
      </section>
    </div>
  );
}
