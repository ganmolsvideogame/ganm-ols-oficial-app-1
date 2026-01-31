type RatingProps = {
  value?: number | null;
  count?: number | null;
};

export default function Rating({ value, count }: RatingProps) {
  if (!value) {
    return null;
  }
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  const stars = Array.from({ length: 5 }, (_, index) =>
    index < rounded ? "★" : "☆"
  ).join("");

  return (
    <span className="text-xs text-zinc-500">
      <span className="text-zinc-800">{stars}</span>
      {typeof count === "number" ? ` (${count})` : ""}
    </span>
  );
}
