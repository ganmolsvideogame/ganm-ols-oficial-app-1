import { SELLER_WHATSAPP_CHANNEL_URL } from "@/lib/config/seller-channel";

type SellerBroadcastChannelCardProps = {
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  buttonLabel?: string;
};

export default function SellerBroadcastChannelCard({
  className = "",
  compact = false,
  title = "Grupo exclusivo para vendedores",
  description = "Entre no canal para acompanhar oportunidades, avisos e novidades voltadas para quem vende na GANM OLS.",
  buttonLabel = "Entrar no grupo",
}: SellerBroadcastChannelCardProps) {
  return (
    <div
      className={`rounded-[1.8rem] border border-emerald-200 bg-emerald-50 p-5 text-zinc-900 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-emerald-600 p-2 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 4a8 8 0 00-6.9 12.1L4 20l4.1-1.1A8 8 0 1012 4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9 9.8c.2-.5.5-.5.7-.5h.6c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3 0 .5.4.8 1.1 1.5 1.9 1.9.2.1.3 0 .5 0l.5-.4c.2-.1.4-.2.6-.1l1.5.6c.4.1.4.3.4.5v.6c0 .2 0 .5-.5.7-.4.2-1.2.3-2.3-.1-1-.4-2.2-1.2-3.1-2.2-.9-.9-1.8-2-2.2-3.1-.4-1.1-.3-1.9-.1-2.3z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Canal no WhatsApp
          </p>
          <h3
            className={`mt-1 font-semibold tracking-tight text-zinc-950 ${
              compact ? "text-base" : "text-xl"
            }`}
          >
            {title}
          </h3>
          <p className={`mt-2 text-zinc-700 ${compact ? "text-sm leading-6" : "text-sm leading-7"}`}>
            {description}
          </p>
          <a
            href={SELLER_WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {buttonLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
