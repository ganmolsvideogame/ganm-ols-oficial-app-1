"use client";
import React, { useEffect, useMemo, useState } from "react";

type Banner = {
  id: string;
  imageUrl: string;
  href: string;
  alt: string;
};

export function BannerCarousel({
  banners,
  autoMs = 6000,
}: {
  banners: Banner[];
  autoMs?: number;
}) {
  const safe = useMemo(() => banners?.filter(Boolean) ?? [], [banners]);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!safe.length) return;
    const t = setInterval(() => setI((p) => (p + 1) % safe.length), autoMs);
    return () => clearInterval(t);
  }, [safe.length, autoMs]);

  if (!safe.length) return null;

  const prev = () => setI((p) => (p - 1 + safe.length) % safe.length);
  const next = () => setI((p) => (p + 1) % safe.length);

  return (
    <div className="ml-banner">
      {safe.map((b, idx) => (
        <a
          key={b.id}
          href={b.href}
          className={`ml-banner-slide ${idx === i ? "is-active" : ""}`}
          aria-label={b.alt}
        >
          <img src={b.imageUrl} alt={b.alt} className="ml-banner-img" />
        </a>
      ))}

      <button type="button" className="ml-nav left" aria-label="Voltar" onClick={prev} />
      <button type="button" className="ml-nav right" aria-label="Avançar" onClick={next} />

      <div className="ml-dots" aria-label="Indicador de banners">
        {safe.map((_, idx) => (
          <span
            key={idx}
            className={`ml-dot ${idx === i ? "is-active" : ""}`}
            onClick={() => setI(idx)}
          />
        ))}
      </div>
    </div>
  );
}
