import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Blog", href: "/blog" },
  { label: "Parceiros", href: "/parceiros" },
  { label: "Valores", href: "/valores" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Politica de devolucao", href: "/politica-de-devolucao" },
  { label: "Politica de privacidade", href: "/politica-de-privacidade" },
  { label: "Contato", href: "/contato" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 text-sm text-zinc-200 md:flex-row md:items-center md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logoinvertidalogo.png"
              alt="GANM OLS"
              width={215}
              height={67}
              className="h-7 w-auto"
            />
          </Link>
          <div className="text-xs text-zinc-400">
            GANM OLS (c) {new Date().getFullYear()}
          </div>
        </div>
        <nav className="flex flex-wrap gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-zinc-200 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
