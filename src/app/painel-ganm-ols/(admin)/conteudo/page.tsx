import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import ImageUploadField from "@/components/listings/ImageUploadField";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type SectionRow = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  section_type: string | null;
  position: number | null;
  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

type ItemRow = {
  id: string;
  section_id: string;
  title: string | null;
  image_url: string | null;
  href: string | null;
  cta_label: string | null;
  secondary_label: string | null;
  show_buttons: boolean | null;
  position: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleDateString("pt-BR");
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || adminCheck !== true) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  const { data: sectionsData } = await supabase
    .from("home_sections")
    .select(
      "id, slug, title, description, section_type, position, is_active, starts_at, ends_at, created_at"
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: itemsData } = await supabase
    .from("home_items")
    .select(
      "id, section_id, title, image_url, href, cta_label, secondary_label, show_buttons, position, starts_at, ends_at, created_at"
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const sections = (sectionsData ?? []) as SectionRow[];
  const items = (itemsData ?? []) as ItemRow[];

  return (
    <main className="space-y-8">
      {resolvedSearchParams?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Conteudo
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Criar secao de banners
            </h2>
          </div>
        </div>
        <form
          action="/api/admin/content"
          method="post"
          encType="multipart/form-data"
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input type="hidden" name="action" value="create_section" />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Slug
            </label>
            <input
              name="slug"
              placeholder="home-banners"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Titulo
            </label>
            <input
              name="title"
              placeholder="Banners principais"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Tipo
            </label>
            <select
              name="section_type"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              defaultValue="banner"
            >
              <option value="banner">Banner</option>
              <option value="modal">Modal</option>
              <option value="cards">Cards</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Descricao
            </label>
            <input
              name="description"
              placeholder="Campanha ou observacao"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Posicao
            </label>
            <input
              name="position"
              type="number"
              min="0"
              placeholder="0"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inicio
            </label>
            <input
              name="starts_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Fim
            </label>
            <input
              name="ends_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              id="section-active"
              name="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              defaultChecked
            />
            <label htmlFor="section-active">Ativo</label>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Criar secao
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Banners
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Criar banner
            </h2>
          </div>
        </div>
        <form
          action="/api/admin/content"
          method="post"
          encType="multipart/form-data"
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input type="hidden" name="action" value="create_item" />
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Secao
            </label>
            <select
              name="section_id"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Selecione a secao
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title || section.slug}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Posicao
            </label>
            <input
              name="position"
              type="number"
              min="0"
              placeholder="0"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Titulo
            </label>
            <input
              name="title"
              placeholder="Banner promocional"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Texto do botao principal
            </label>
            <input
              name="cta_label"
              placeholder="Aceitar oferta"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Link
            </label>
            <input
              name="href"
              placeholder="https://"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Texto secundario / descricao
            </label>
            <input
              name="secondary_label"
              placeholder="Em outro momento"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <ImageUploadField
              name="image"
              label="Imagem do banner"
              helperText="Envie o arquivo do banner que sera exibido na vitrine."
              multiple={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inicio
            </label>
            <input
              name="starts_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Fim
            </label>
            <input
              name="ends_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-3">
            <input
              id="show-buttons"
              name="show_buttons"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              defaultChecked
            />
            <label htmlFor="show-buttons">Exibir botoes no banner</label>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Criar banner
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Secoes</h2>
          <span className="text-sm text-zinc-500">Total: {sections.length}</span>
        </div>
        <div className="grid gap-4">
          {sections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma secao cadastrada.
            </div>
          ) : (
            sections.map((section) => {
              const sectionItems = items.filter((item) => item.section_id === section.id);
              return (
                <div
                  key={section.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {section.section_type || "manual"}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {section.title || section.slug}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {section.description || "Sem descricao"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Valido de {formatDate(section.starts_at)} ate{" "}
                        {formatDate(section.ends_at)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>
                        Criado em{" "}
                        {section.created_at ? section.created_at.slice(0, 10) : "Sem data"}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${
                          section.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {section.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action="/api/admin/content" method="post">
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="action" value="toggle_section" />
                      <input
                        type="hidden"
                        name="is_active"
                        value={section.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {section.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action="/api/admin/content" method="post">
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="action" value="delete_section" />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Excluir secao
                      </button>
                    </form>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {sectionItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
                        Nenhum banner cadastrado para esta secao.
                      </div>
                    ) : (
                      sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600"
                        >
                          <div className="flex items-start gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title || "Banner"}
                                className="h-16 w-16 rounded-2xl border border-zinc-200 object-cover"
                              />
                            ) : null}
                            <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                              {item.title || "Sem titulo"}
                            </p>
                            <p className="mt-1">
                              {item.image_url ? "Imagem enviada" : "Sem imagem"}
                            </p>
                            <p className="mt-1">
                              {item.href ? `Link: ${item.href}` : "Sem link"}
                            </p>
                            <p className="mt-1">
                              {item.show_buttons === false
                                ? "Sem botoes"
                                : item.cta_label
                                  ? `Botao: ${item.cta_label}`
                                  : "Botao padrao"}
                            </p>
                            {item.secondary_label ? (
                              <p className="mt-1">
                                Secundario: {item.secondary_label}
                              </p>
                            ) : null}
                            </div>
                          </div>
                          <div className="text-right text-xs text-zinc-500">
                            <p>Posicao: {item.position ?? 0}</p>
                            <p>
                              {formatDate(item.starts_at)} - {formatDate(item.ends_at)}
                            </p>
                            <form action="/api/admin/content" method="post" className="mt-2">
                              <input type="hidden" name="item_id" value={item.id} />
                              <input type="hidden" name="action" value="delete_item" />
                              <button
                                type="submit"
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                              >
                                Excluir banner
                              </button>
                            </form>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
