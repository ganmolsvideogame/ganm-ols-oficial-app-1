"use client";

import { useState } from "react";

import {
  CATALOG_AI_ISSUE_LABELS,
  type CatalogAiReport,
} from "@/lib/admin/catalog-ai";

type CatalogAiAnalyzerProps = {
  initialReport: CatalogAiReport;
};

function formatBRL(cents: number | null) {
  if (!cents || !Number.isFinite(cents)) {
    return "R$ 0,00";
  }

  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function issueLabel(issue: string) {
  return CATALOG_AI_ISSUE_LABELS[issue] ?? issue;
}

function ReportView({ report }: { report: CatalogAiReport }) {
  const problemProducts = report.products.filter((product) => product.issues.length > 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Produtos
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {report.totalProducts}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Nota media
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {report.averageScore}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Com alerta
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {problemProducts.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Duplicados
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {report.duplicateTitles.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Principais alertas</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(report.issueCounts).length === 0 ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Nenhum alerta encontrado
              </span>
            ) : (
              Object.entries(report.issueCounts).map(([issue, count]) => (
                <span
                  key={issue}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                >
                  {issueLabel(issue)}: {count}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Recomendacoes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(report.recommendationBuckets).map(([bucket, count]) => (
              <span
                key={bucket}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700"
              >
                {bucket}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {problemProducts.slice(0, 30).map((product) => (
          <article
            key={`${product.sourceType}-${product.id}`}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  {product.platform || "sem plataforma"} / {product.category || "sem categoria"}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">
                  {product.title || "Produto sem titulo"}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatBRL(product.priceCents)} / score {product.score} /{" "}
                  {product.recommendationBucket}
                </p>
              </div>
              <div className="flex max-w-xl flex-wrap gap-2">
                {product.issues.map((issue) => (
                  <span
                    key={issue}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    {issueLabel(issue)}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
              {product.salesCopy}
            </p>
          </article>
        ))}

        {problemProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Nenhum produto com alerta nesta analise.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CatalogAiAnalyzer({ initialReport }: CatalogAiAnalyzerProps) {
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<CatalogAiReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function analyzeImport() {
    setIsLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch("/api/admin/catalog-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const payload = (await response.json()) as {
        report?: CatalogAiReport;
        error?: string;
      };

      if (!response.ok || !payload.report) {
        throw new Error(payload.error ?? "Nao foi possivel analisar o conteudo.");
      }

      setReport(payload.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao analisar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          IA de catalogo
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Auditoria dos produtos atuais
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Esta analise procura problemas que afetam venda: preco zerado, imagens
          repetidas, descricao fraca, categoria errada, plataforma ausente e copy
          com cara de observacao interna.
        </p>
        <div className="mt-6">
          <ReportView report={initialReport} />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Pre-importacao
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Testar JSON ou CSV antes de importar
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Cole um lote de produtos para a IA apontar erros antes de entrar no
          catalogo. Isso evita produto repetido, preco zero e texto generico.
        </p>

        <div className="mt-5 grid gap-4">
          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={8}
            placeholder={'title,description,price,platform,category,images\n"Console PS2","Descricao do anuncio",539.90,"PlayStation 2","Console","https://..."'}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none focus:border-zinc-900"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyzeImport}
              disabled={isLoading || !raw.trim()}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Analisando..." : "Analisar com IA"}
            </button>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>

        {report ? (
          <div className="mt-6">
            <ReportView report={report} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
