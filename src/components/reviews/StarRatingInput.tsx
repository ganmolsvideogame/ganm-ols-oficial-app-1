"use client";

import { useState } from "react";

type StarRatingInputProps = {
  name?: string;
  defaultValue?: number;
  size?: number;
};

const MAX_STARS = 5;

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_STARS, Math.round(value)));
}

function StarIcon({ active, size }: { active: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      className={active ? "text-zinc-900" : "text-zinc-300"}
    >
      <path
        d="M12 2l2.9 6.1 6.7.6-5 4.3 1.5 6.6L12 16l-6.1 3.6L7.4 13l-5-4.3 6.7-.6L12 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StarRatingInput({
  name = "rating",
  defaultValue = 0,
  size = 20,
}: StarRatingInputProps) {
  const [rating, setRating] = useState(clampRating(defaultValue));

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={rating} />
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_STARS }).map((_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="rounded-full p-1 transition hover:scale-105"
              aria-label={`Avaliar ${value} estrela${value === 1 ? "" : "s"}`}
            >
              <StarIcon active={value <= rating} size={size} />
            </button>
          );
        })}
      </div>
      <span className="text-xs text-zinc-500">
        {rating > 0 ? `${rating}/5` : "Sem nota"}
      </span>
    </div>
  );
}
