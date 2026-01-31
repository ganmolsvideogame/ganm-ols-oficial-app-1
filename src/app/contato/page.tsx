export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Contato</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Fale com o time GANM OLS para parcerias, suporte ou feedback.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <form className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Nome</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Email</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              placeholder="voce@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">
              Assunto
            </label>
            <input
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              placeholder="Ex: Parceria, suporte, feedback"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">
              Mensagem
            </label>
            <textarea
              className="min-h-[140px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              placeholder="Conte como podemos ajudar"
            />
          </div>
          <a
            href="mailto:contato@ganmols.com?subject=Contato%20GANM%20OLS"
            className="block w-full rounded-full bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Enviar mensagem
          </a>
        </form>

        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Informacoes rapidas
          </h2>
          <div className="space-y-3 text-sm text-zinc-600">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Email
              </p>
              <p className="mt-1">contato@ganmols.com</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Horario
              </p>
              <p className="mt-1">Seg a sex 09h as 18h</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Local
              </p>
              <p className="mt-1">Sao Paulo, Brasil</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
            Em breve: chat dedicado e central de ajuda integrada.
          </div>
        </div>
      </div>
    </div>
  );
}

