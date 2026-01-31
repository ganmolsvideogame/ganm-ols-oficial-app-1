import { formatCentsToBRL } from "@/lib/utils/price";

type PriceProps = {
  cents: number | null;
  size?: "sm" | "md" | "lg";
};

export default function Price({ cents, size = "md" }: PriceProps) {
  const sizeClass =
    size === "lg" ? "text-xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className={`${sizeClass} font-semibold text-zinc-900`}>
      {formatCentsToBRL(cents ?? 0)}
    </span>
  );
}
