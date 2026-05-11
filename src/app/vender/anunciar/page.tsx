import Image from "next/image";
import Link from "next/link";

import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import { requireSeller } from "@/lib/auth/requireSeller";

export default async function Page() {
  await requireSeller("/vender/anunciar");

  const options = [
    {
      title: "Consoles",
      src: "/ganmols_consoles_icon_black_vector.svg",
      href: "/vender/anunciar/categoria?kind=consoles",
    },
    {
      title: "Jogos",
      src: "/ganmols_jogos_disco_black_clean.png",
      href: "/vender/anunciar/categoria?kind=jogos",
    },
    {
      title: "Acessorios",
      src: "/ganmols_acessorios_mouse_black_v3.svg",
      href: "/vender/anunciar/categoria?kind=acessorios",
    },
    {
      title: "Colecionaveis",
      src: "/ganmols_colecionaveis_chatgpt_2026.png",
      href: "/vender/anunciar/categoria?kind=colecionaveis",
    },
  ];

  return (
    <ListingFlowShell
      backHref="/vender"
      topTitle="Publicar"
      title="Ola! Antes de mais nada, o que voce vai anunciar?"
      contentAreaClassName="bg-[#e6e6e6]"
      innerClassName="pb-5"
    >
      <div className="h-full pt-2">
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
          {options.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              className="flex min-h-0 flex-col items-center justify-center rounded-[1.85rem] bg-white px-4 py-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5"
            >
              <div className="flex h-32 items-center justify-center sm:h-36">
                <Image
                  src={option.src}
                  alt=""
                  aria-hidden="true"
                  width={132}
                  height={132}
                  className="h-28 w-28 object-contain sm:h-32 sm:w-32"
                  unoptimized
                />
              </div>
              <p className="mt-3 text-xl font-medium tracking-[-0.03em] text-zinc-950 sm:text-2xl">
                {option.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </ListingFlowShell>
  );
}
