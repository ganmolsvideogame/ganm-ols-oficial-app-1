import Link from "next/link";

import { FAMILIES, SUBCATEGORIES } from "@/lib/mock/data";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Categorias GANM OLS
        </h1>
        <p className="text-sm text-zinc-600">
          Explore familias, subcategorias e filtros por plataforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FAMILIES.map((family) => (
          <div
            key={family.slug}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {family.name}
              </h2>
              <Link
                href={`/marca/${family.slug}`}
                className="text-xs font-semibold text-zinc-600"
              >
                Ver produtos
              </Link>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              {family.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(SUBCATEGORIES[family.slug] || []).map((subcategory) => (
                <Link
                  key={`${family.slug}-${subcategory}`}
                  href={`/buscar?familia=${family.slug}&sub=${encodeURIComponent(
                    subcategory.toLowerCase()
                  )}`}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600"
                >
                  {subcategory}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
