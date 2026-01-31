type BadgeProps = {
  label: string;
  variant?: "solid" | "outline";
};

export default function Badge({ label, variant = "outline" }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]";
  const styles =
    variant === "solid"
      ? "bg-zinc-900 text-white"
      : "border border-zinc-200 text-zinc-500";

  return <span className={`${base} ${styles}`}>{label}</span>;
}
