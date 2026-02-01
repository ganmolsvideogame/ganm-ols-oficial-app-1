"use client";
import React, { useMemo, useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  stepRatio?: number; // quanto do width rola por clique
};

export function MLCarousel({ children, className = "", stepRatio = 0.9 }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const step = useMemo(() => {
    const el = railRef.current;
    if (!el) return 600;
    return Math.floor(el.clientWidth * stepRatio);
  }, [stepRatio]);

  const scrollBy = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.floor(el.clientWidth * stepRatio) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={`ml-rail-wrap ${className}`}>
      <div ref={railRef} className="ml-rail" aria-label="Carrossel">
        {children}
      </div>

      <button
        type="button"
        className="ml-arrow ml-arrow-left"
        aria-label="Voltar"
        onClick={() => scrollBy(-1)}
      />
      <button
        type="button"
        className="ml-arrow ml-arrow-right"
        aria-label="Avançar"
        onClick={() => scrollBy(1)}
      />
    </div>
  );
}
