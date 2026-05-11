"use client";

import { useMemo, useState } from "react";
import { getAffiliateDisplayImageUrl } from "@/lib/affiliate/images";

type GalleryImage = {
  id: string;
  url: string;
};

type ProductGalleryProps = {
  title: string;
  images: GalleryImage[];
  fallbackUrl?: string | null;
};

export default function ProductGallery({
  title,
  images,
  fallbackUrl,
}: ProductGalleryProps) {
  const normalizedImages = useMemo(() => {
    if (images.length > 0) {
      return images.map((image) => ({
        ...image,
        url: getAffiliateDisplayImageUrl(image.url),
      }));
    }
    if (fallbackUrl) {
      return [
        {
          id: "fallback",
          url: getAffiliateDisplayImageUrl(fallbackUrl),
        },
      ];
    }
    return [];
  }, [fallbackUrl, images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = normalizedImages[activeIndex] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)]">
      <div className="hidden lg:flex lg:flex-col lg:gap-3">
        {normalizedImages.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-20 w-20 overflow-hidden rounded-2xl border bg-zinc-50 ${
              index === activeIndex
                ? "border-zinc-900"
                : "border-zinc-200 hover:border-zinc-400"
            }`}
            aria-label={`Selecionar imagem ${index + 1}`}
          >
            <img
              src={image.url}
              alt={title}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex aspect-square w-full items-center justify-center bg-zinc-50 sm:aspect-[4/3]">
            {active ? (
              <img
                src={active.url}
                alt={title}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-sm text-zinc-400">Sem imagem</div>
            )}
          </div>
        </div>

        {normalizedImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-3 pb-1 sm:grid-cols-5 lg:hidden">
            {normalizedImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`aspect-square w-full overflow-hidden rounded-2xl border bg-zinc-50 ${
                  index === activeIndex
                    ? "border-zinc-900"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
                aria-label={`Selecionar imagem ${index + 1}`}
              >
                <img
                  src={image.url}
                  alt={title}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
