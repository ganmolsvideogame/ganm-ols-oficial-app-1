import Link from "next/link";

const footerLinks = [
  { label: "Valores", href: "/valores" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Politica de privacidade", href: "/politica-de-privacidade" },
  { label: "Contato", href: "/contato" },
];

export default function Footer() {
  return (
    <footer className="hidden border-t border-zinc-200 bg-white md:block">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 text-sm text-zinc-600 md:flex-row md:items-center md:px-6">
        <div className="text-xs text-zinc-500">
          GANM OLS © {new Date().getFullYear()} - Marketplace gamer.
        </div>
        <nav className="flex flex-wrap gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
