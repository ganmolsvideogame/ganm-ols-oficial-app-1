"use client";
import React, { useRef } from "react";

export function ProductCarousel({
  children,
  stepRatio = 0.9,
}: {
  children: React.ReactNode;
  stepRatio?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.floor(el.clientWidth * stepRatio) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="ml-rail-wrap">
      <div ref={ref} className="ml-rail">
        {children}
      </div>
      <button type="button" className="ml-arrow left" aria-label="Voltar" onClick={() => scrollBy(-1)} />
      <button type="button" className="ml-arrow right" aria-label="Avançar" onClick={() => scrollBy(1)} />
    </div>
  );
}
