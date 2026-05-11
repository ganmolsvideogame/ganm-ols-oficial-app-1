import Image from "next/image";

import { hasPublicAsset } from "@/lib/blog/assets";

type BlogImageFrameProps = {
  src: string;
  alt: string;
  title: string;
  aspectClassName?: string;
  containerClassName?: string;
  imageClassName?: string;
  eager?: boolean;
  renderMode?: "fill" | "natural";
};

export default function BlogImageFrame({
  src,
  alt,
  title,
  aspectClassName = "aspect-[16/9]",
  containerClassName = "",
  imageClassName = "h-full w-full object-cover",
  eager = false,
  renderMode = "fill",
}: BlogImageFrameProps) {
  const localAssetExists = hasPublicAsset(src);

  if (localAssetExists) {
    if (renderMode === "natural") {
      return (
        <div className={containerClassName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            className={imageClassName}
          />
        </div>
      );
    }

    return (
      <div
        className={`relative overflow-hidden ${aspectClassName} ${containerClassName}`.trim()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          priority={eager}
          unoptimized
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[linear-gradient(180deg,#18181b,#27272a)] p-6 text-white ${
        renderMode === "fill" ? aspectClassName : ""
      } ${containerClassName}`.trim()}
    >
      <div className="max-w-xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
          GANM OLS
        </p>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-[-0.04em]">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-white/72">
          Importe esta imagem em{" "}
          <span className="font-semibold text-white">{`public${src}`}</span>
        </p>
      </div>
    </div>
  );
}
